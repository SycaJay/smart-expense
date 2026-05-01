<?php

declare(strict_types=1);

// POST /api/settlement-plan-open — snapshot owed amounts → plan rows.
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
if ($podId <= 0) {
    Http::json(['error' => 'podId is required'], 422);
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
        Http::json(['error' => 'Only pod admins can open a settlement plan'], 403);
        return;
    }
    if ((string) $access['pod_status'] === 'archived') {
        $pdo->rollBack();
        Http::json(['error' => 'Archived pods are closed for settlement planning'], 422);
        return;
    }

    $balances = SettlementEngine::balancesForPod($pdo, $podId);
    $transfers = SettlementEngine::minimizeTransfers($balances);
    $planId = SettlementEngine::createOpenPlan($pdo, $podId, $viewerId, $transfers);

    $pdo->commit();
    Http::json([
        'ok' => true,
        'message' => 'Settlement plan opened',
        'data' => [
            'settlementPlanId' => $planId,
            'status' => 'open',
            'transferCount' => count($transfers),
            'transfers' => $transfers,
        ],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Http::json(['error' => 'Could not open settlement plan', 'detail' => $e->getMessage()], 503);
}
