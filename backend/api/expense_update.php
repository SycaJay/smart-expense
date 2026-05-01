<?php

declare(strict_types=1);

// POST /api/expense-update — creator or admin.
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
$title = trim((string) ($input['title'] ?? ''));
$amount = (float) ($input['amount'] ?? 0);
$categoryLabel = trim((string) ($input['category'] ?? ''));
$subcategory = trim((string) ($input['subcategory'] ?? ''));
$splitModeInput = trim((string) ($input['splitMode'] ?? 'equal'));
$splitScope = trim((string) ($input['splitScope'] ?? 'all'));
$expenseDate = trim((string) ($input['expenseDate'] ?? ''));
/** @var array<int, int|string> $participantIdsInput */
$participantIdsInput = is_array($input['participantIds'] ?? null) ? $input['participantIds'] : [];
/** @var array<string, int|float|string> $participantWeightsInput */
$participantWeightsInput = is_array($input['participantWeights'] ?? null) ? $input['participantWeights'] : [];

if ($expenseId <= 0 || $title === '' || $amount <= 0 || $categoryLabel === '') {
    Http::json(['error' => 'expenseId, title, amount, and category are required'], 422);
    return;
}
if (!in_array($splitModeInput, ['equal', 'percentage'], true)) {
    Http::json(['error' => 'splitMode must be equal or percentage'], 422);
    return;
}
if (!in_array($splitScope, ['all', 'category_only'], true)) {
    Http::json(['error' => 'splitScope must be all or category_only'], 422);
    return;
}
if ($expenseDate === '') {
    $expenseDate = date('Y-m-d');
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
    $podId = (int) $expense['pod_id'];
    if ((string) $expense['pod_status'] === 'archived') {
        $pdo->rollBack();
        Http::json(['error' => 'Archived pods are closed for expense edits'], 422);
        return;
    }

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
        Http::json(['error' => 'Only pod members can edit expenses'], 403);
        return;
    }
    $isAdmin = (string) $access['member_role'] === 'admin';
    $isOwner = (int) $expense['created_by_user_id'] === $viewerId;
    if (!$isAdmin && !$isOwner) {
        $pdo->rollBack();
        Http::json(['error' => 'Only the creator or an admin can edit this expense'], 403);
        return;
    }

    $categoryStmt = $pdo->prepare(
        'SELECT pod_category_id
         FROM pod_categories
         WHERE pod_id = :pod_id AND category_label = :label
         LIMIT 1'
    );
    $categoryStmt->execute([':pod_id' => $podId, ':label' => $categoryLabel]);
    $categoryRow = $categoryStmt->fetch();
    $categoryId = $categoryRow !== false ? (int) $categoryRow['pod_category_id'] : 0;
    if ($categoryId <= 0) {
        $sortStmt = $pdo->prepare(
            'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort
             FROM pod_categories
             WHERE pod_id = :pod_id'
        );
        $sortStmt->execute([':pod_id' => $podId]);
        $nextSort = (int) (($sortStmt->fetch()['next_sort'] ?? 1));
        $insertCategory = $pdo->prepare(
            'INSERT INTO pod_categories (pod_id, category_label, show_on_dashboard, sort_order)
             VALUES (:pod_id, :label, 1, :sort_order)'
        );
        $insertCategory->execute([
            ':pod_id' => $podId,
            ':label' => $categoryLabel,
            ':sort_order' => $nextSort,
        ]);
        $categoryId = (int) $pdo->lastInsertId();
    }

    $notes = $subcategory !== '' ? ('Subcategory: ' . $subcategory) : null;
    if ($splitModeInput === 'percentage' || $splitScope === 'category_only') {
        $ruleNote = sprintf('Split rule: %s (%s)', $splitModeInput, $splitScope);
        $notes = $notes === null ? $ruleNote : ($notes . ' | ' . $ruleNote);
    }
    $splitModeDb = $splitModeInput === 'percentage' ? 'weighted' : 'equal';

    $updateStmt = $pdo->prepare(
        'UPDATE expenses
         SET pod_category_id = :pod_category_id,
             expense_title = :title,
             amount = :amount,
             split_mode = :split_mode,
             expense_date = :expense_date,
             notes = :notes
         WHERE expense_id = :expense_id'
    );
    $updateStmt->execute([
        ':pod_category_id' => $categoryId,
        ':title' => $title,
        ':amount' => $amount,
        ':split_mode' => $splitModeDb,
        ':expense_date' => $expenseDate,
        ':notes' => $notes,
        ':expense_id' => $expenseId,
    ]);

    $membersStmt = $pdo->prepare('SELECT user_id FROM pod_members WHERE pod_id = :pod_id');
    $membersStmt->execute([':pod_id' => $podId]);
    $memberIdsRaw = $membersStmt->fetchAll(PDO::FETCH_COLUMN);
    $memberIds = array_map(static fn($v): int => (int) $v, $memberIdsRaw);
    $memberLookup = array_flip($memberIds);
    $participantIds = [];
    if ($participantIdsInput !== []) {
        foreach ($participantIdsInput as $pidRaw) {
            $pid = (int) $pidRaw;
            if ($pid > 0 && isset($memberLookup[$pid])) {
                $participantIds[$pid] = true;
            }
        }
    }
    if ($participantIds === []) {
        foreach ($memberIds as $mid) {
            $participantIds[$mid] = true;
        }
    }
    $participantIdList = array_keys($participantIds);
    $participantCount = max(1, count($participantIdList));
    $equalWeight = round(1 / $participantCount, 4);

    $deleteParts = $pdo->prepare('DELETE FROM expense_participants WHERE expense_id = :expense_id');
    $deleteParts->execute([':expense_id' => $expenseId]);
    $insertPart = $pdo->prepare(
        'INSERT INTO expense_participants (expense_id, user_id, weight)
         VALUES (:expense_id, :user_id, :weight)'
    );
    foreach ($participantIdList as $participantUserId) {
        $weight = $equalWeight;
        if ($splitModeInput === 'percentage') {
            $rawWeight = $participantWeightsInput[(string) $participantUserId] ?? null;
            $parsedWeight = $rawWeight !== null ? (float) $rawWeight : 0.0;
            if ($parsedWeight > 0) {
                $weight = round($parsedWeight, 4);
            }
        }
        $insertPart->execute([
            ':expense_id' => $expenseId,
            ':user_id' => $participantUserId,
            ':weight' => $weight,
        ]);
    }

    $pdo->commit();
    Http::json([
        'ok' => true,
        'message' => 'Expense updated successfully',
        'data' => ['expenseId' => $expenseId, 'podId' => $podId],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Http::json(['error' => 'Unable to update expense', 'detail' => $e->getMessage()], 503);
}
