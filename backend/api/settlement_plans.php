<?php

declare(strict_types=1);

// GET /api/settlement-plans
$authUser = Http::requireAuthUser();
$viewerId = (int) $authUser['id'];

$podId = (int) ($_GET['podId'] ?? 0);
$status = strtolower(trim((string) ($_GET['status'] ?? '')));
if ($podId <= 0) {
    Http::json(['error' => 'podId is required'], 422);
    return;
}
if ($status !== '' && !in_array($status, ['open', 'closed', 'cancelled'], true)) {
    Http::json(['error' => 'status must be open, closed, or cancelled'], 422);
    return;
}

try {
    $pdo = Database::pdo();
    $memberStmt = $pdo->prepare(
        'SELECT member_role
         FROM pod_members
         WHERE pod_id = :pod_id AND user_id = :user_id
         LIMIT 1'
    );
    $memberStmt->execute([':pod_id' => $podId, ':user_id' => $viewerId]);
    $member = $memberStmt->fetch();
    if (!is_array($member)) {
        Http::json(['error' => 'You are not a member of this pod'], 403);
        return;
    }

    $sql = 'SELECT
                sp.settlement_plan_id,
                sp.status,
                sp.created_at,
                sp.updated_at,
                COALESCE(SUM(CASE WHEN st.status = "pending" THEN 1 ELSE 0 END), 0) AS pending_transfers,
                COALESCE(SUM(CASE WHEN st.status = "paid" THEN 1 ELSE 0 END), 0) AS paid_transfers,
                COALESCE(SUM(CASE WHEN st.status = "cancelled" THEN 1 ELSE 0 END), 0) AS cancelled_transfers
            FROM settlement_plans sp
            LEFT JOIN settlement_transfers st ON st.settlement_plan_id = sp.settlement_plan_id
            WHERE sp.pod_id = :pod_id';
    if ($status !== '') {
        $sql .= ' AND sp.status = :status';
    }
    $sql .= ' GROUP BY sp.settlement_plan_id, sp.status, sp.created_at, sp.updated_at
              ORDER BY sp.settlement_plan_id DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':pod_id', $podId, PDO::PARAM_INT);
    if ($status !== '') {
        $stmt->bindValue(':status', $status, PDO::PARAM_STR);
    }
    $stmt->execute();
    $plans = $stmt->fetchAll();

    Http::json([
        'ok' => true,
        'data' => [
            'podId' => $podId,
            'plans' => array_map(
                static fn(array $row): array => [
                    'settlementPlanId' => (int) $row['settlement_plan_id'],
                    'status' => (string) $row['status'],
                    'createdAt' => (string) $row['created_at'],
                    'updatedAt' => (string) $row['updated_at'],
                    'pendingTransfers' => (int) $row['pending_transfers'],
                    'paidTransfers' => (int) $row['paid_transfers'],
                    'cancelledTransfers' => (int) $row['cancelled_transfers'],
                ],
                $plans
            ),
        ],
    ]);
} catch (Throwable $e) {
    Http::json(['error' => 'Could not fetch settlement plans', 'detail' => $e->getMessage()], 503);
}
