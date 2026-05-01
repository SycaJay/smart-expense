<?php

declare(strict_types=1);

// POST /api/settlement-plan-reconcile — close plan if nothing pending.
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
$planId = (int) ($input['settlementPlanId'] ?? 0);
if ($podId <= 0 || $planId <= 0) {
    Http::json(['error' => 'podId and settlementPlanId are required'], 422);
    return;
}

try {
    $pdo = Database::pdo();
    $pdo->beginTransaction();

    $accessStmt = $pdo->prepare(
        'SELECT pm.member_role
         FROM pod_members pm
         WHERE pm.pod_id = :pod_id AND pm.user_id = :user_id
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
        Http::json(['error' => 'Only pod admins can reconcile settlement plans'], 403);
        return;
    }

    $planStmt = $pdo->prepare(
        'SELECT status
         FROM settlement_plans
         WHERE settlement_plan_id = :plan_id
           AND pod_id = :pod_id
         LIMIT 1'
    );
    $planStmt->execute([':plan_id' => $planId, ':pod_id' => $podId]);
    $plan = $planStmt->fetch();
    if (!is_array($plan)) {
        $pdo->rollBack();
        Http::json(['error' => 'Settlement plan not found'], 404);
        return;
    }

    $status = (string) $plan['status'];
    if ($status === 'cancelled') {
        $pdo->rollBack();
        Http::json(['error' => 'Cancelled plans cannot be reconciled'], 422);
        return;
    }
    if ($status === 'closed') {
        $pdo->rollBack();
        Http::json(['ok' => true, 'message' => 'Plan already closed', 'data' => ['status' => 'closed']]);
        return;
    }

    $closed = SettlementEngine::closePlanIfSettled($pdo, $planId);

    $pendingStmt = $pdo->prepare(
        'SELECT COUNT(*) AS pending_count
         FROM settlement_transfers
         WHERE settlement_plan_id = :plan_id
           AND status = "pending"'
    );
    $pendingStmt->execute([':plan_id' => $planId]);
    $pendingCount = (int) ($pendingStmt->fetchColumn() ?: 0);

    $paidStmt = $pdo->prepare(
        'SELECT COUNT(*) AS paid_count
         FROM settlement_transfers
         WHERE settlement_plan_id = :plan_id
           AND status = "paid"'
    );
    $paidStmt->execute([':plan_id' => $planId]);
    $paidCount = (int) ($paidStmt->fetchColumn() ?: 0);

    $pdo->commit();
    Http::json([
        'ok' => true,
        'message' => $closed ? 'Settlement plan closed' : 'Settlement plan still open',
        'data' => [
            'settlementPlanId' => $planId,
            'status' => $closed ? 'closed' : 'open',
            'pendingTransfers' => $pendingCount,
            'paidTransfers' => $paidCount,
        ],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Http::json(['error' => 'Could not reconcile settlement plan', 'detail' => $e->getMessage()], 503);
}
