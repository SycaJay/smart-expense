<?php

declare(strict_types=1);

/**
 * POST /api/expenses
 * Pod members can add bills.
 */
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
$inviteCode = strtoupper(trim((string) ($input['inviteCode'] ?? '')));
$title = trim((string) ($input['title'] ?? ''));
$amount = (float) ($input['amount'] ?? 0);
$categoryLabel = trim((string) ($input['category'] ?? ''));
$subcategory = trim((string) ($input['subcategory'] ?? ''));
$splitModeInput = trim((string) ($input['splitMode'] ?? 'equal'));
$splitScope = trim((string) ($input['splitScope'] ?? 'all'));
$expenseDate = trim((string) ($input['expenseDate'] ?? ''));

if ($title === '' || $amount <= 0 || $categoryLabel === '') {
    Http::json(['error' => 'title, amount, and category are required'], 422);
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

    if ($podId <= 0 && $inviteCode !== '') {
        $podStmt = $pdo->prepare('SELECT pod_id FROM pods WHERE invite_code = :invite_code LIMIT 1');
        $podStmt->execute([':invite_code' => $inviteCode]);
        $pod = $podStmt->fetch();
        if (is_array($pod)) {
            $podId = (int) $pod['pod_id'];
        }
    }

    if ($podId <= 0) {
        $pdo->rollBack();
        Http::json(['error' => 'podId is required'], 422);
        return;
    }

    // Enforce: everyone in the pod can add a bill.
    $memberStmt = $pdo->prepare(
        'SELECT pod_member_id FROM pod_members WHERE pod_id = :pod_id AND user_id = :user_id LIMIT 1'
    );
    $memberStmt->execute([':pod_id' => $podId, ':user_id' => $viewerId]);
    if ($memberStmt->fetch() === false) {
        $pdo->rollBack();
        Http::json(['error' => 'Only pod members can add bills'], 403);
        return;
    }

    $categoryStmt = $pdo->prepare(
        'SELECT pod_category_id FROM pod_categories WHERE pod_id = :pod_id AND category_label = :label LIMIT 1'
    );
    $categoryStmt->execute([':pod_id' => $podId, ':label' => $categoryLabel]);
    $categoryRow = $categoryStmt->fetch();
    $categoryId = $categoryRow !== false ? (int) $categoryRow['pod_category_id'] : 0;

    if ($categoryId <= 0) {
        $sortStmt = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort FROM pod_categories WHERE pod_id = :pod_id');
        $sortStmt->execute([':pod_id' => $podId]);
        $nextSort = (int) (($sortStmt->fetch()['next_sort'] ?? 1));

        $insertCategory = $pdo->prepare(
            'INSERT INTO pod_categories (pod_id, category_label, show_on_dashboard, sort_order) VALUES (:pod_id, :label, 1, :sort_order)'
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

    $expenseStmt = $pdo->prepare(
        'INSERT INTO expenses (
            pod_id,
            pod_category_id,
            expense_title,
            amount,
            split_mode,
            paid_by_user_id,
            expense_date,
            notes,
            created_by_user_id
        ) VALUES (
            :pod_id,
            :pod_category_id,
            :title,
            :amount,
            :split_mode,
            :paid_by_user_id,
            :expense_date,
            :notes,
            :created_by_user_id
        )'
    );
    $expenseStmt->execute([
        ':pod_id' => $podId,
        ':pod_category_id' => $categoryId,
        ':title' => $title,
        ':amount' => $amount,
        ':split_mode' => $splitModeDb,
        ':paid_by_user_id' => $viewerId,
        ':expense_date' => $expenseDate,
        ':notes' => $notes,
        ':created_by_user_id' => $viewerId,
    ]);
    $expenseId = (int) $pdo->lastInsertId();

    $membersStmt = $pdo->prepare('SELECT user_id FROM pod_members WHERE pod_id = :pod_id');
    $membersStmt->execute([':pod_id' => $podId]);
    $memberIds = $membersStmt->fetchAll(PDO::FETCH_COLUMN);
    $memberCount = max(1, count($memberIds));
    $equalWeight = round(1 / $memberCount, 4);

    $participantStmt = $pdo->prepare(
        'INSERT INTO expense_participants (expense_id, user_id, weight) VALUES (:expense_id, :user_id, :weight)'
    );
    foreach ($memberIds as $memberIdRaw) {
        $participantStmt->execute([
            ':expense_id' => $expenseId,
            ':user_id' => (int) $memberIdRaw,
            ':weight' => $equalWeight,
        ]);
    }

    $podStmt = $pdo->prepare('SELECT pod_name, currency FROM pods WHERE pod_id = :pod_id LIMIT 1');
    $podStmt->execute([':pod_id' => $podId]);
    $podRow = $podStmt->fetch();
    $podName = is_array($podRow) ? (string) $podRow['pod_name'] : 'your pod';
    $currency = is_array($podRow) ? strtoupper((string) $podRow['currency']) : 'USD';

    $membersEmailStmt = $pdo->prepare(
        'SELECT u.user_id, u.full_name, u.email
         FROM pod_members pm
         INNER JOIN users u ON u.user_id = pm.user_id
         WHERE pm.pod_id = :pod_id'
    );
    $membersEmailStmt->execute([':pod_id' => $podId]);
    $memberContacts = $membersEmailStmt->fetchAll();

    $pdo->commit();

    $amountLabel = number_format($amount, 2);
    $expenseDateLabel = $expenseDate;
    $paidByName = (string) $authUser['fullName'];
    $subject = 'New bill added in ' . $podName;
    foreach ($memberContacts as $contact) {
        $recipientId = (int) ($contact['user_id'] ?? 0);
        $recipientEmail = strtolower(trim((string) ($contact['email'] ?? '')));
        $recipientName = (string) ($contact['full_name'] ?? 'Member');

        if (!filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
            continue;
        }

        $isActor = $recipientId === $viewerId;
        $intro = $isActor
            ? 'You added a new bill.'
            : (htmlspecialchars($paidByName, ENT_QUOTES, 'UTF-8') . ' added a new bill.');

        $body = '
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
              <h2 style="margin:0 0 12px;">New bill in ' . htmlspecialchars($podName, ENT_QUOTES, 'UTF-8') . '</h2>
              <p>' . $intro . '</p>
              <p><strong>Title:</strong> ' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</p>
              <p><strong>Amount:</strong> ' . htmlspecialchars($currency, ENT_QUOTES, 'UTF-8') . ' ' . $amountLabel . '</p>
              <p><strong>Category:</strong> ' . htmlspecialchars($categoryLabel, ENT_QUOTES, 'UTF-8') . '</p>
              <p><strong>Date:</strong> ' . htmlspecialchars($expenseDateLabel, ENT_QUOTES, 'UTF-8') . '</p>
              <p><strong>Split:</strong> ' . htmlspecialchars($splitModeInput, ENT_QUOTES, 'UTF-8') . ' (' . htmlspecialchars($splitScope, ENT_QUOTES, 'UTF-8') . ')</p>
              <p>Balances will update immediately in your Smart Expense dashboard.</p>
              <p style="margin-top:20px;">- Smart Expense Team</p>
            </div>
        ';
        $plain = ($isActor ? 'You added a new bill.' : "{$paidByName} added a new bill.") . "\n"
            . "Pod: {$podName}\n"
            . "Title: {$title}\n"
            . "Amount: {$currency} {$amountLabel}\n"
            . "Category: {$categoryLabel}\n"
            . "Date: {$expenseDateLabel}\n"
            . "Split: {$splitModeInput} ({$splitScope})\n"
            . "Smart Expense Team";

        Mailer::send($recipientEmail, $recipientName, $subject, $body, $plain);
    }

    Http::json([
        'ok' => true,
        'message' => 'Bill added successfully',
        'data' => [
            'expenseId' => $expenseId,
            'podId' => $podId,
            'title' => $title,
            'amount' => $amount,
            'category' => $categoryLabel,
            'splitMode' => $splitModeInput,
            'splitScope' => $splitScope,
        ],
    ], 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Http::json(
        [
            'error' => 'Unable to add expense',
            'detail' => $e->getMessage(),
        ],
        503
    );
}
