<?php

declare(strict_types=1);

// POST /api/expense-delete — creator or admin.
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

$expenseId = (int) ($input['expenseId'] ?? 0);
if ($expenseId <= 0) {
    Http::json(['error' => 'expenseId is required'], 422);
    return;
}

try {
    $pdo = Database::pdo();
    $pdo->beginTransaction();

    $expenseStmt = $pdo->prepare(
        'SELECT e.pod_id, e.created_by_user_id, p.pod_status
         FROM expenses e
         INNER JOIN pods p ON p.pod_id = e.pod_id
         WHERE e.expense_id = :expense_id
         LIMIT 1'
    );
    $expenseStmt->execute([':expense_id' => $expenseId]);
    $expense = $expenseStmt->fetch();
    if (!is_array($expense)) {
        $pdo->rollBack();
        Http::json(['error' => 'Expense not found'], 404);
        return;
    }
    if ((string) $expense['pod_status'] === 'archived') {
        $pdo->rollBack();
        Http::json(['error' => 'Archived pods are closed for expense edits'], 422);
        return;
    }
    $podId = (int) $expense['pod_id'];

    $accessStmt = $pdo->prepare(
        'SELECT member_role
         FROM pod_members
         WHERE pod_id = :pod_id AND user_id = :user_id
         LIMIT 1'
    );
    $accessStmt->execute([':pod_id' => $podId, ':user_id' => $viewerId]);
    $access = $accessStmt->fetch();
    if (!is_array($access)) {
        $pdo->rollBack();
        Http::json(['error' => 'Only pod members can delete expenses'], 403);
        return;
    }
    $isAdmin = (string) $access['member_role'] === 'admin';
    $isOwner = (int) $expense['created_by_user_id'] === $viewerId;
    if (!$isAdmin && !$isOwner) {
        $pdo->rollBack();
        Http::json(['error' => 'Only the creator or an admin can delete this expense'], 403);
        return;
    }

    $deleteStmt = $pdo->prepare('DELETE FROM expenses WHERE expense_id = :expense_id');
    $deleteStmt->execute([':expense_id' => $expenseId]);

    $pdo->commit();
    Http::json([
        'ok' => true,
        'message' => 'Expense deleted successfully',
        'data' => ['expenseId' => $expenseId, 'podId' => $podId],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Http::json(['error' => 'Unable to delete expense', 'detail' => $e->getMessage()], 503);
}
