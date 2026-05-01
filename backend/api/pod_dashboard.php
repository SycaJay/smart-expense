<?php

declare(strict_types=1);

// GET /api/pod-dashboard — main pod screen payload.
$authUser = Http::requireAuthUser();
$viewerId = (int) $authUser['id'];
$inviteCode = strtoupper(trim((string) ($_GET['inviteCode'] ?? '')));

function resolvePod(PDO $pdo, int $viewerId, string $inviteCode): ?array
{
    if ($inviteCode !== '') {
        $stmt = $pdo->prepare(
            'SELECT p.pod_id, p.pod_name, p.invite_code, p.currency, p.default_split_method, p.pod_status
             FROM pods p
             WHERE p.invite_code = :invite_code
             LIMIT 1'
        );
        $stmt->execute([':invite_code' => $inviteCode]);
        $row = $stmt->fetch();
        if (is_array($row)) {
            return [
                'pod_id' => (int) $row['pod_id'],
                'pod_name' => (string) $row['pod_name'],
                'invite_code' => (string) $row['invite_code'],
                'currency' => (string) $row['currency'],
                'default_split_method' => (string) $row['default_split_method'],
                'pod_status' => (string) $row['pod_status'],
            ];
        }
    }

    $stmt = $pdo->prepare(
        'SELECT p.pod_id, p.pod_name, p.invite_code, p.currency, p.default_split_method, p.pod_status
         FROM pods p
         INNER JOIN pod_members pm ON pm.pod_id = p.pod_id
         WHERE pm.user_id = :viewer_id
         ORDER BY p.pod_id DESC
         LIMIT 1'
    );
    $stmt->execute([':viewer_id' => $viewerId]);
    $row = $stmt->fetch();
    if (is_array($row)) {
        return [
            'pod_id' => (int) $row['pod_id'],
            'pod_name' => (string) $row['pod_name'],
            'invite_code' => (string) $row['invite_code'],
            'currency' => (string) $row['currency'],
            'default_split_method' => (string) $row['default_split_method'],
            'pod_status' => (string) $row['pod_status'],
        ];
    }

    return null;
}

try {
    $pdo = Database::pdo();
    $pod = resolvePod($pdo, $viewerId, $inviteCode);

    if ($pod === null) {
        Http::json([
            'ok' => true,
            'data' => [
                'pod' => null,
                'viewerName' => (string) $authUser['fullName'],
                'viewerId' => $viewerId,
                'members' => [],
                'categories' => [],
                'totals' => [
                    'spending' => 0.0,
                    'youOwe' => 0.0,
                ],
                'people' => [],
                'netBalances' => [],
                'memberLabel' => [],
                'transactions' => [],
                'adminNotice' => null,
            ],
        ]);
        return;
    }

    $podId = (int) $pod['pod_id'];
    $currency = (string) $pod['currency'];

    $membersStmt = $pdo->prepare(
        'SELECT pm.user_id, pm.member_role, u.full_name
         FROM pod_members pm
         INNER JOIN users u ON u.user_id = pm.user_id
         WHERE pm.pod_id = :pod_id
         ORDER BY pm.pod_member_id ASC'
    );
    $membersStmt->execute([':pod_id' => $podId]);
    $memberRows = $membersStmt->fetchAll();

    $members = [];
    $memberRoles = [];
    $memberLabel = [];
    $netBalances = [];
    $memberIds = [];
    foreach ($memberRows as $row) {
        $id = (int) $row['user_id'];
        $name = (string) $row['full_name'];
        $members[] = [
            'id' => $id,
            'name' => $name,
            'role' => (string) $row['member_role'],
        ];
        $memberRoles[$id] = (string) $row['member_role'];
        $memberLabel[(string) $id] = $name;
        $netBalances[(string) $id] = 0.0;
        $memberIds[] = $id;
    }
    if (!in_array($viewerId, $memberIds, true)) {
        $memberIds[] = $viewerId;
        $memberLabel[(string) $viewerId] = (string) $authUser['fullName'];
        $netBalances[(string) $viewerId] = 0.0;
        $members[] = [
            'id' => $viewerId,
            'name' => (string) $authUser['fullName'],
            'role' => 'member',
        ];
        $memberRoles[$viewerId] = 'member';
    }

    $memberCount = max(1, count($memberIds));

    $categoryStmt = $pdo->prepare(
        'SELECT pod_category_id, category_label
         FROM pod_categories
         WHERE pod_id = :pod_id
         ORDER BY sort_order ASC, pod_category_id ASC'
    );
    $categoryStmt->execute([':pod_id' => $podId]);
    $categoryRows = $categoryStmt->fetchAll();

    $emojiMap = [
        'rent' => '🏠',
        'utilities' => '⚡',
        'transport' => '🚗',
        'food' => '🥘',
        'internet' => '📶',
        'settle up' => '💸',
        'other' => '👥',
    ];

    $categories = [];
    $categoryOrder = [];
    foreach ($categoryRows as $row) {
        $categoryId = (string) $row['pod_category_id'];
        $label = (string) $row['category_label'];
        $emoji = $emojiMap[strtolower($label)] ?? '📂';
        $categories[$categoryId] = [
            'category_id' => $categoryId,
            'emoji' => $emoji,
            'label' => $label,
            'total' => 0.0,
            'you_owe' => 0.0,
            'expenses' => [],
        ];
        $categoryOrder[] = $categoryId;
    }

    $expenseStmt = $pdo->prepare(
        'SELECT
            e.expense_id,
            e.pod_category_id,
            e.expense_title,
            e.amount,
            e.split_mode,
            e.notes,
            e.expense_date,
            e.paid_by_user_id,
            e.created_by_user_id,
            cp.category_label,
            payer.full_name AS paid_by_name,
            creator.full_name AS added_by_name
         FROM expenses e
         LEFT JOIN pod_categories cp ON cp.pod_category_id = e.pod_category_id
         INNER JOIN users payer ON payer.user_id = e.paid_by_user_id
         INNER JOIN users creator ON creator.user_id = e.created_by_user_id
         WHERE e.pod_id = :pod_id
         ORDER BY e.expense_date DESC, e.expense_id DESC'
    );
    $expenseStmt->execute([':pod_id' => $podId]);
    $expenseRows = $expenseStmt->fetchAll();

    $transactions = [];
    $paidByCategory = [];
    $viewerOwesByPersonCategory = [];
    $totalSpending = 0.0;
    $viewerYouOwe = 0.0;

    foreach ($expenseRows as $row) {
        $amount = (float) $row['amount'];
        $expenseId = (string) $row['expense_id'];
        $paidById = (int) $row['paid_by_user_id'];
        $addedByName = (string) $row['added_by_name'];
        $paidByName = (string) $row['paid_by_name'];
        $categoryId = $row['pod_category_id'] !== null ? (string) $row['pod_category_id'] : 'uncategorized';
        $categoryLabel = trim((string) ($row['category_label'] ?? '')) !== '' ? (string) $row['category_label'] : 'Other';
        $notes = (string) ($row['notes'] ?? '');
        $subcategory = '';
        $splitScope = 'all';
        if ($notes !== '') {
            if (preg_match('/Subcategory:\s*([^|]+)/i', $notes, $m) === 1) {
                $subcategory = trim((string) $m[1]);
            }
            if (preg_match('/Split rule:\s*(equal|percentage)\s*\((all|category_only)\)/i', $notes, $m) === 1) {
                $splitScope = strtolower((string) $m[2]) === 'category_only' ? 'category_only' : 'all';
            }
        }
        $splitMode = (string) ($row['split_mode'] ?? 'equal') === 'weighted' ? 'percentage' : 'equal';

        if (!isset($categories[$categoryId])) {
            $categories[$categoryId] = [
                'category_id' => $categoryId,
                'emoji' => $emojiMap[strtolower($categoryLabel)] ?? '📂',
                'label' => $categoryLabel,
                'total' => 0.0,
                'you_owe' => 0.0,
                'expenses' => [],
            ];
            $categoryOrder[] = $categoryId;
        }

        $categories[$categoryId]['total'] += $amount;
        $categories[$categoryId]['expenses'][] = [
            'expense_id' => $expenseId,
            'title' => (string) $row['expense_title'],
            'amount' => $amount,
            'subcategory' => $subcategory,
            'split_mode' => $splitMode,
            'split_scope' => $splitScope,
            'paid_by' => $paidByName,
            'added_by' => $addedByName,
            'can_edit' => ((int) $row['created_by_user_id'] === $viewerId) || (($memberRoles[$viewerId] ?? 'member') === 'admin'),
            'date_label' => (string) $row['expense_date'],
        ];

        $participantsStmt = $pdo->prepare(
            'SELECT user_id, weight
             FROM expense_participants
             WHERE expense_id = :expense_id'
        );
        $participantsStmt->execute([':expense_id' => (int) $row['expense_id']]);
        $parts = $participantsStmt->fetchAll();
        $totalWeight = 0.0;
        foreach ($parts as $part) {
            $totalWeight += max(0.0, (float) $part['weight']);
        }
        if ($totalWeight <= 0.0) {
            $totalWeight = (float) $memberCount;
            $parts = array_map(
                static fn(int $id): array => ['user_id' => $id, 'weight' => 1],
                $memberIds
            );
        }

        foreach ($parts as $part) {
            $memberId = (int) $part['user_id'];
            $weight = max(0.0, (float) $part['weight']);
            $share = $amount * ($weight / $totalWeight);
            $key = (string) $memberId;
            if (!isset($netBalances[$key])) {
                $netBalances[$key] = 0.0;
            }
            if ($memberId === $paidById) {
                $netBalances[$key] += ($amount - $share);
            } else {
                $netBalances[$key] -= $share;
            }

            if ($memberId === $viewerId && $viewerId !== $paidById) {
                $categories[$categoryId]['you_owe'] += $share;
                $viewerYouOwe += $share;
                $viewerOwesByPersonCategory[(string) $paidById][$categoryLabel] =
                    ($viewerOwesByPersonCategory[(string) $paidById][$categoryLabel] ?? 0.0) + $share;
            }
        }
        $lastIdx = count($categories[$categoryId]['expenses']) - 1;
        if ($lastIdx >= 0) {
            $categories[$categoryId]['expenses'][$lastIdx]['participant_ids'] = array_map(
                static fn(array $p): int => (int) $p['user_id'],
                $parts
            );
            $categories[$categoryId]['expenses'][$lastIdx]['participant_weights'] = array_reduce(
                $parts,
                static function (array $carry, array $p): array {
                    $carry[(string) ((int) $p['user_id'])] = (float) $p['weight'];
                    return $carry;
                },
                []
            );
        }

        $paidByCategory[(string) $paidById][$categoryLabel] =
            ($paidByCategory[(string) $paidById][$categoryLabel] ?? 0.0) + $amount;

        $totalSpending += $amount;
        $transactions[] = [
            'tx_id' => 'exp-' . $expenseId,
            'date_label' => (string) $row['expense_date'],
            'title' => (string) $row['expense_title'],
            'category' => $categoryLabel,
            'amount' => $amount,
            'actor' => 'Added by ' . $addedByName . ' · paid by ' . $paidByName,
            'kind' => 'expense',
        ];
    }

    $paymentsStmt = $pdo->prepare(
        'SELECT
            pr.payment_id,
            pr.paid_at,
            pr.amount,
            payer.full_name AS payer_name,
            receiver.full_name AS receiver_name
         FROM payment_records pr
         INNER JOIN settlement_transfers st ON st.transfer_id = pr.transfer_id
         INNER JOIN settlement_plans sp ON sp.settlement_plan_id = st.settlement_plan_id
         INNER JOIN users payer ON payer.user_id = pr.payer_user_id
         INNER JOIN users receiver ON receiver.user_id = pr.receiver_user_id
         WHERE sp.pod_id = :pod_id
         ORDER BY pr.paid_at DESC, pr.payment_id DESC'
    );
    $paymentsStmt->execute([':pod_id' => $podId]);
    $paymentRows = $paymentsStmt->fetchAll();
    foreach ($paymentRows as $row) {
        $transactions[] = [
            'tx_id' => 'pay-' . (string) $row['payment_id'],
            'date_label' => (string) $row['paid_at'],
            'title' => 'Settlement payment',
            'category' => 'Settle up',
            'amount' => (float) $row['amount'],
            'actor' => (string) $row['payer_name'] . ' paid ' . (string) $row['receiver_name'],
            'kind' => 'payment',
        ];
    }

    usort(
        $transactions,
        static fn(array $a, array $b): int => strcmp((string) $b['date_label'], (string) $a['date_label'])
    );

    $people = [];
    foreach ($members as $member) {
        $memberId = (string) $member['id'];
        $paidRows = [];
        foreach (($paidByCategory[$memberId] ?? []) as $label => $value) {
            $paidRows[] = ['category' => (string) $label, 'amount' => (float) $value];
        }

        $oweRows = [];
        foreach (($viewerOwesByPersonCategory[$memberId] ?? []) as $label => $value) {
            $oweRows[] = ['category' => (string) $label, 'amount' => (float) $value];
        }

        $people[] = [
            'person_id' => $memberId,
            'name' => (string) $member['name'],
            'paid_by_category' => $paidRows,
            'you_owe_by_category' => $oweRows,
        ];
    }

    $orderedCategories = [];
    foreach ($categoryOrder as $categoryId) {
        if (isset($categories[$categoryId])) {
            $orderedCategories[] = $categories[$categoryId];
        }
    }

    $adminNotice = null;
    $noticeStmt = $pdo->prepare(
        'SELECT notice_id, payload_json
         FROM pod_admin_notices
         WHERE pod_id = :pod_id
           AND target_user_id = :target_user_id
           AND notice_type = "member_left_split_policy"
           AND is_resolved = 0
         ORDER BY notice_id DESC
         LIMIT 1'
    );
    $noticeStmt->execute([':pod_id' => $podId, ':target_user_id' => $viewerId]);
    $noticeRow = $noticeStmt->fetch();
    if (is_array($noticeRow)) {
        $payload = null;
        $rawPayload = (string) ($noticeRow['payload_json'] ?? '');
        if ($rawPayload !== '') {
            try {
                /** @var array<string, mixed> $decoded */
                $decoded = json_decode($rawPayload, true, 512, JSON_THROW_ON_ERROR);
                $payload = $decoded;
            } catch (Throwable $ignored) {
                $payload = null;
            }
        }
        $adminNotice = [
            'noticeId' => (int) $noticeRow['notice_id'],
            'kind' => 'member_left_split_policy',
            'leftUserName' => (string) ($payload['leftUserName'] ?? 'A member'),
            'reason' => (string) ($payload['reason'] ?? ''),
            'previousDefaultSplitMethod' => (string) ($payload['previousDefaultSplitMethod'] ?? $pod['default_split_method']),
            'remainingMemberCount' => (int) ($payload['remainingMemberCount'] ?? max(0, count($members) - 1)),
        ];
    }

    Http::json([
        'ok' => true,
        'data' => [
            'pod' => [
                'podId' => $podId,
                'podName' => (string) $pod['pod_name'],
                'inviteCode' => (string) $pod['invite_code'],
                'currency' => $currency,
                'defaultSplitMethod' => (string) $pod['default_split_method'],
                'isArchived' => (string) $pod['pod_status'] === 'archived',
            ],
            'viewerName' => (string) $authUser['fullName'],
            'viewerId' => $viewerId,
            'members' => $members,
            'categories' => $orderedCategories,
            'totals' => [
                'spending' => $totalSpending,
                'youOwe' => $viewerYouOwe,
            ],
            'people' => $people,
            'netBalances' => $netBalances,
            'memberLabel' => $memberLabel,
            'transactions' => $transactions,
            'adminNotice' => $adminNotice,
        ],
    ]);
} catch (Throwable $e) {
    Http::json(
        [
            'error' => 'Database unavailable',
            'detail' => $e->getMessage(),
        ],
        503
    );
}
