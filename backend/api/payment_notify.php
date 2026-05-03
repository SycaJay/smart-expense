<?php

declare(strict_types=1);

// POST /api/payment-notify — admin confirms external payment + emails.
$authUser = Http::requireAuthUser();
$actorUserId = (int) $authUser['id'];

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
$payerUserId = (int) ($input['payerUserId'] ?? 0);
$receiverUserId = (int) ($input['receiverUserId'] ?? 0);
$amount = (float) ($input['amount'] ?? 0);
$currency = strtoupper(trim((string) ($input['currency'] ?? 'USD')));
$note = trim((string) ($input['note'] ?? ''));

if ($podId <= 0 || $payerUserId <= 0 || $receiverUserId <= 0 || $amount <= 0) {
    Http::json(['error' => 'podId, payerUserId, receiverUserId and amount are required'], 422);
    return;
}

try {
    $pdo = Database::pdo();
    $pdo->beginTransaction();

    $podStmt = $pdo->prepare('SELECT pod_name, pod_status FROM pods WHERE pod_id = :pod_id LIMIT 1');
    $podStmt->execute([':pod_id' => $podId]);
    $pod = $podStmt->fetch();
    if (!is_array($pod)) {
        Http::json(['error' => 'Pod not found'], 404);
        return;
    }
    if ((string) $pod['pod_status'] === 'archived') {
        Http::json(['error' => 'Archived pods are closed for new payment activity'], 422);
        return;
    }
    $podName = (string) $pod['pod_name'];

    $accessStmt = $pdo->prepare(
        'SELECT member_role
         FROM pod_members
         WHERE pod_id = :pod_id AND user_id = :user_id
         LIMIT 1'
    );
    $accessStmt->execute([':pod_id' => $podId, ':user_id' => $actorUserId]);
    $access = $accessStmt->fetch();
    if (!is_array($access) || (string) $access['member_role'] !== 'admin') {
        Http::json(['error' => 'Only pod admins can confirm external payments'], 403);
        return;
    }

    $memberStmt = $pdo->prepare(
        'SELECT pm.user_id, u.first_name, u.last_name, u.email
         FROM pod_members pm
         INNER JOIN users u ON u.user_id = pm.user_id
         WHERE pm.pod_id = :pod_id AND pm.user_id IN (:actor_id, :payer_id, :receiver_id)'
    );
    $memberStmt->bindValue(':pod_id', $podId, PDO::PARAM_INT);
    $memberStmt->bindValue(':actor_id', $actorUserId, PDO::PARAM_INT);
    $memberStmt->bindValue(':payer_id', $payerUserId, PDO::PARAM_INT);
    $memberStmt->bindValue(':receiver_id', $receiverUserId, PDO::PARAM_INT);
    $memberStmt->execute();
    $rows = $memberStmt->fetchAll();

    $actor = null;
    $payer = null;
    $receiver = null;
    foreach ($rows as $row) {
        $id = (int) $row['user_id'];
        if ($id === $actorUserId) {
            $actor = $row;
        }
        if ($id === $payerUserId) {
            $payer = $row;
        }
        if ($id === $receiverUserId) {
            $receiver = $row;
        }
    }

    if (!is_array($actor) || !is_array($payer) || !is_array($receiver)) {
        $pdo->rollBack();
        Http::json(['error' => 'Both payer and receiver must be pod members'], 403);
        return;
    }

    $actorName = UserDisplay::fromUserRow($actor);
    $payerName = UserDisplay::fromUserRow($payer);
    $receiverName = UserDisplay::fromUserRow($receiver);
    $receiverEmail = strtolower(trim((string) $receiver['email']));
    $payerEmail = strtolower(trim((string) $payer['email']));
    $amountLabel = number_format($amount, 2);
    $safeNote = htmlspecialchars($note, ENT_QUOTES, 'UTF-8');

    $openPlanStmt = $pdo->prepare(
        'SELECT settlement_plan_id
         FROM settlement_plans
         WHERE pod_id = :pod_id
           AND status = "open"
         ORDER BY settlement_plan_id DESC
         LIMIT 1'
    );
    $openPlanStmt->execute([':pod_id' => $podId]);
    $openPlanId = (int) ($openPlanStmt->fetchColumn() ?: 0);

    if ($openPlanId <= 0) {
        $balances = SettlementEngine::balancesForPod($pdo, $podId);
        $transfers = SettlementEngine::minimizeTransfers($balances);
        $openPlanId = SettlementEngine::createOpenPlan($pdo, $podId, $actorUserId, $transfers);
    }

    $transferStmt = $pdo->prepare(
        'SELECT transfer_id
         FROM settlement_transfers
         WHERE settlement_plan_id = :plan_id
           AND from_user_id = :from_user_id
           AND to_user_id = :to_user_id
           AND amount = :amount
         ORDER BY transfer_id ASC
         LIMIT 1'
    );
    $transferStmt->execute([
        ':plan_id' => $openPlanId,
        ':from_user_id' => $payerUserId,
        ':to_user_id' => $receiverUserId,
        ':amount' => number_format($amount, 2, '.', ''),
    ]);
    $transferId = (int) ($transferStmt->fetchColumn() ?: 0);

    if ($transferId <= 0) {
        $newTransferStmt = $pdo->prepare(
            'INSERT INTO settlement_transfers (settlement_plan_id, from_user_id, to_user_id, amount, status)
             VALUES (:plan_id, :from_user_id, :to_user_id, :amount, "pending")'
        );
        $newTransferStmt->execute([
            ':plan_id' => $openPlanId,
            ':from_user_id' => $payerUserId,
            ':to_user_id' => $receiverUserId,
            ':amount' => number_format($amount, 2, '.', ''),
        ]);
        $transferId = (int) $pdo->lastInsertId();
    }

    $paymentStmt = $pdo->prepare(
        'INSERT INTO payment_records (transfer_id, payer_user_id, receiver_user_id, amount, paid_at, note)
         VALUES (:transfer_id, :payer_user_id, :receiver_user_id, :amount, NOW(), :note)'
    );
    $paymentStmt->execute([
        ':transfer_id' => $transferId,
        ':payer_user_id' => $payerUserId,
        ':receiver_user_id' => $receiverUserId,
        ':amount' => number_format($amount, 2, '.', ''),
        ':note' => $note !== '' ? $note : null,
    ]);
    $paymentId = (int) $pdo->lastInsertId();

    $markPaidStmt = $pdo->prepare(
        'UPDATE settlement_transfers
         SET status = "paid"
         WHERE transfer_id = :transfer_id'
    );
    $markPaidStmt->execute([':transfer_id' => $transferId]);

    $planClosed = SettlementEngine::closePlanIfSettled($pdo, $openPlanId);

    $subjectReceiver = 'External settlement confirmed in ' . $podName;
    $bodyReceiver = '
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
          <h2 style="margin:0 0 12px;">Payment update</h2>
          <p><strong>' . htmlspecialchars($actorName, ENT_QUOTES, 'UTF-8') . '</strong> confirmed that <strong>' . htmlspecialchars($payerName, ENT_QUOTES, 'UTF-8') . '</strong> has paid you externally in <strong>' . htmlspecialchars($podName, ENT_QUOTES, 'UTF-8') . '</strong>.</p>
          <p>Amount: <strong>' . htmlspecialchars($currency, ENT_QUOTES, 'UTF-8') . ' ' . $amountLabel . '</strong></p>
          ' . ($safeNote !== '' ? ('<p>Note: ' . $safeNote . '</p>') : '') . '
          <p>Open your Smart Expense dashboard to confirm and keep balances up to date.</p>
          <p style="margin-top:20px;">- Smart Expense Team</p>
        </div>
    ';
    $plainReceiver = "{$actorName} confirmed that {$payerName} paid you externally in {$podName}.\n"
        . "Amount: {$currency} {$amountLabel}\n"
        . ($note !== '' ? "Note: {$note}\n" : '')
        . "Smart Expense Team";

    $subjectPayer = 'External settlement recorded for ' . $podName;
    $bodyPayer = '
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
          <h2 style="margin:0 0 12px;">Payment recorded</h2>
          <p><strong>' . htmlspecialchars($actorName, ENT_QUOTES, 'UTF-8') . '</strong> confirmed your external payment in <strong>' . htmlspecialchars($podName, ENT_QUOTES, 'UTF-8') . '</strong>.</p>
          <p>Recorded transfer: <strong>' . htmlspecialchars($payerName, ENT_QUOTES, 'UTF-8') . '</strong> to <strong>' . htmlspecialchars($receiverName, ENT_QUOTES, 'UTF-8') . '</strong> for <strong>' . htmlspecialchars($currency, ENT_QUOTES, 'UTF-8') . ' ' . $amountLabel . '</strong>.</p>
          ' . ($safeNote !== '' ? ('<p>Note: ' . $safeNote . '</p>') : '') . '
          <p style="margin-top:20px;">- Smart Expense Team</p>
        </div>
    ';
    $plainPayer = "{$actorName} confirmed your external payment in {$podName}.\n"
        . "Recorded transfer: {$payerName} -> {$receiverName} ({$currency} {$amountLabel}).\n"
        . ($note !== '' ? "Note: {$note}\n" : '')
        . "Smart Expense Team";

    $subjectActor = 'External payment confirmation recorded in ' . $podName;
    $bodyActor = '
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
          <h2 style="margin:0 0 12px;">Confirmation saved</h2>
          <p>You recorded an external payment confirmation in <strong>' . htmlspecialchars($podName, ENT_QUOTES, 'UTF-8') . '</strong>.</p>
          <p><strong>' . htmlspecialchars($payerName, ENT_QUOTES, 'UTF-8') . '</strong> paid <strong>' . htmlspecialchars($receiverName, ENT_QUOTES, 'UTF-8') . '</strong> <strong>' . htmlspecialchars($currency, ENT_QUOTES, 'UTF-8') . ' ' . $amountLabel . '</strong> outside the app.</p>
          ' . ($safeNote !== '' ? ('<p>Note: ' . $safeNote . '</p>') : '') . '
          <p style="margin-top:20px;">- Smart Expense Team</p>
        </div>
    ';
    $plainActor = "You recorded an external payment confirmation in {$podName}.\n"
        . "{$payerName} paid {$receiverName} {$currency} {$amountLabel} outside the app.\n"
        . ($note !== '' ? "Note: {$note}\n" : '')
        . "Smart Expense Team";

    $receiverSent = false;
    $payerSent = false;
    $actorSent = false;

    if ($receiverEmail !== '' && filter_var($receiverEmail, FILTER_VALIDATE_EMAIL)) {
        $receiverSent = Mailer::send($receiverEmail, $receiverName, $subjectReceiver, $bodyReceiver, $plainReceiver);
    }
    if ($payerEmail !== '' && filter_var($payerEmail, FILTER_VALIDATE_EMAIL)) {
        $payerSent = Mailer::send($payerEmail, $payerName, $subjectPayer, $bodyPayer, $plainPayer);
    }
    $actorEmail = strtolower(trim((string) $actor['email']));
    if ($actorEmail !== '' && filter_var($actorEmail, FILTER_VALIDATE_EMAIL)) {
        $actorSent = Mailer::send($actorEmail, $actorName, $subjectActor, $bodyActor, $plainActor);
    }

    $pdo->commit();

    Http::json([
        'ok' => true,
        'message' => 'Payment notifications processed',
        'data' => [
            'settlementPlanId' => $openPlanId,
            'transferId' => $transferId,
            'paymentId' => $paymentId,
            'planClosed' => $planClosed,
            'receiverEmailSent' => $receiverSent,
            'payerEmailSent' => $payerSent,
            'adminEmailSent' => $actorSent,
        ],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Http::json(['error' => 'Failed to notify payment', 'detail' => $e->getMessage()], 503);
}
