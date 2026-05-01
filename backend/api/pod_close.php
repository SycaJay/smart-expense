<?php

declare(strict_types=1);

// POST /api/pod-close — archive when squared up.
$authUser = Http::requireAuthUser();
$viewerId = (int) $authUser['id'];

try {
    $raw = file_get_contents('php://input');
    if ($raw === false) {
        Http::json(['error' => 'Unable to read request body'], 400);
        return;
    }
    /** @var array<string, mixed> $input */
    $input = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    Http::json(['error' => 'Invalid JSON payload', 'detail' => $e->getMessage()], 400);
    return;
}

$podId = (int) ($input['podId'] ?? 0);
$reason = trim((string) ($input['reason'] ?? ''));
$confirmArchive = (bool) ($input['confirmArchive'] ?? false);

if ($podId <= 0) {
    Http::json(['error' => 'podId is required'], 422);
    return;
}
if (!$confirmArchive) {
    Http::json(['error' => 'Archive confirmation is required'], 422);
    return;
}
if (mb_strlen($reason) > 500) {
    Http::json(['error' => 'Reason must be <= 500 characters'], 422);
    return;
}

try {
    $pdo = Database::pdo();
    $pdo->beginTransaction();

    $accessStmt = $pdo->prepare(
        'SELECT p.pod_status, pm.member_role
         FROM pods p
         INNER JOIN pod_members pm ON pm.pod_id = p.pod_id
         WHERE p.pod_id = :pod_id AND pm.user_id = :user_id
         LIMIT 1'
    );
    $accessStmt->execute([':pod_id' => $podId, ':user_id' => $viewerId]);
    $access = $accessStmt->fetch();
    if (!is_array($access)) {
        $pdo->rollBack();
        Http::json(['error' => 'You are not a member of this pod'], 403);
        return;
    }
    if ((string) $access['member_role'] !== 'admin') {
        $pdo->rollBack();
        Http::json(['error' => 'Only pod admins can close a pod'], 403);
        return;
    }
    if ((string) $access['pod_status'] === 'archived') {
        $pdo->rollBack();
        Http::json(['error' => 'Pod is already archived'], 422);
        return;
    }

    $memberStmt = $pdo->prepare('SELECT user_id FROM pod_members WHERE pod_id = :pod_id');
    $memberStmt->execute([':pod_id' => $podId]);
    $memberIdsRaw = $memberStmt->fetchAll(PDO::FETCH_COLUMN);
    $memberIds = array_map(static fn($v): int => (int) $v, $memberIdsRaw);
    $balances = [];
    foreach ($memberIds as $uid) {
        $balances[$uid] = 0.0;
    }

    $expenseStmt = $pdo->prepare(
        'SELECT expense_id, amount, paid_by_user_id
         FROM expenses
         WHERE pod_id = :pod_id'
    );
    $expenseStmt->execute([':pod_id' => $podId]);
    $expenses = $expenseStmt->fetchAll();

    $participantsStmt = $pdo->prepare(
        'SELECT user_id, weight
         FROM expense_participants
         WHERE expense_id = :expense_id'
    );

    foreach ($expenses as $expense) {
        $expenseId = (int) $expense['expense_id'];
        $amount = (float) $expense['amount'];
        $paidBy = (int) $expense['paid_by_user_id'];
        if (!isset($balances[$paidBy])) {
            $balances[$paidBy] = 0.0;
        }

        $participantsStmt->execute([':expense_id' => $expenseId]);
        $parts = $participantsStmt->fetchAll();
        $totalWeight = 0.0;
        foreach ($parts as $part) {
            $totalWeight += max(0.0, (float) $part['weight']);
        }
        if ($totalWeight <= 0) {
            continue;
        }

        foreach ($parts as $part) {
            $uid = (int) $part['user_id'];
            $weight = max(0.0, (float) $part['weight']);
            $share = $amount * ($weight / $totalWeight);
            if (!isset($balances[$uid])) {
                $balances[$uid] = 0.0;
            }
            if ($uid === $paidBy) {
                $balances[$uid] += ($amount - $share);
            } else {
                $balances[$uid] -= $share;
            }
        }
    }

    $payStmt = $pdo->prepare(
        'SELECT pr.payer_user_id, pr.receiver_user_id, pr.amount
         FROM payment_records pr
         INNER JOIN settlement_transfers st ON st.transfer_id = pr.transfer_id
         INNER JOIN settlement_plans sp ON sp.settlement_plan_id = st.settlement_plan_id
         WHERE sp.pod_id = :pod_id'
    );
    $payStmt->execute([':pod_id' => $podId]);
    $payments = $payStmt->fetchAll();
    foreach ($payments as $payment) {
        $payer = (int) $payment['payer_user_id'];
        $receiver = (int) $payment['receiver_user_id'];
        $amount = (float) $payment['amount'];
        if (!isset($balances[$payer])) {
            $balances[$payer] = 0.0;
        }
        if (!isset($balances[$receiver])) {
            $balances[$receiver] = 0.0;
        }
        $balances[$payer] += $amount;
        $balances[$receiver] -= $amount;
    }

    $unsettled = [];
    foreach ($balances as $uid => $balance) {
        if (abs($balance) > 0.01) {
            $unsettled[] = ['userId' => $uid, 'balance' => round($balance, 2)];
        }
    }
    if ($unsettled !== []) {
        $pdo->rollBack();
        Http::json([
            'error' => 'Cannot close pod while outstanding balances exist',
            'data' => ['unsettled' => $unsettled],
        ], 422);
        return;
    }

    $closeStmt = $pdo->prepare(
        'UPDATE pods
         SET pod_status = "archived",
             closed_reason = :closed_reason,
             archived_at = NOW(),
             archived_by_user_id = :archived_by_user_id
         WHERE pod_id = :pod_id'
    );
    $closeStmt->execute([
        ':closed_reason' => $reason !== '' ? $reason : null,
        ':archived_by_user_id' => $viewerId,
        ':pod_id' => $podId,
    ]);

    $pdo->commit();
    Http::json([
        'ok' => true,
        'message' => 'Pod archived successfully',
        'data' => ['podId' => $podId, 'status' => 'archived'],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Http::json(['error' => 'Unable to close pod', 'detail' => $e->getMessage()], 503);
}
