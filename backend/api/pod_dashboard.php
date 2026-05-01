<?php

declare(strict_types=1);

/**
 * GET /api/pod-dashboard?inviteCode=HSE-XXXX
 * Returns API-driven dashboard/settings payload for the selected pod.
 */
$authUser = Http::requireAuthUser();
$viewerId = (int) $authUser['id'];
$inviteCode = strtoupper(trim((string) ($_GET['inviteCode'] ?? '')));

/**
 * @return array{pod_id:int,pod_name:string,invite_code:string,currency:string,default_split_method:string}|null
 */
function resolvePod(PDO $pdo, int $viewerId, string $inviteCode): ?array
{
    if ($inviteCode !== '') {
        $stmt = $pdo->prepare(
            'SELECT p.pod_id, p.pod_name, p.invite_code, p.currency, p.default_split_method
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
            ];
        }
    }

    $stmt = $pdo->prepare(
        'SELECT p.pod_id, p.pod_name, p.invite_code, p.currency, p.default_split_method
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
            'subcategory' => $categoryLabel,
            'paid_by' => $paidByName,
            'added_by' => $addedByName,
            'date_label' => (string) $row['expense_date'],
        ];

        $share = $amount / $memberCount;
        foreach ($memberIds as $memberId) {
            $key = (string) $memberId;
            if (!isset($netBalances[$key])) {
                $netBalances[$key] = 0.0;
            }
            if ($memberId === $paidById) {
                $netBalances[$key] += ($amount - $share);
                continue;
            }
            $netBalances[$key] -= $share;
        }

        if ($viewerId !== $paidById) {
            $categories[$categoryId]['you_owe'] += $share;
            $viewerYouOwe += $share;
            $viewerOwesByPersonCategory[(string) $paidById][$categoryLabel] =
                ($viewerOwesByPersonCategory[(string) $paidById][$categoryLabel] ?? 0.0) + $share;
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

    Http::json([
        'ok' => true,
        'data' => [
            'pod' => [
                'podId' => $podId,
                'podName' => (string) $pod['pod_name'],
                'inviteCode' => (string) $pod['invite_code'],
                'currency' => $currency,
                'defaultSplitMethod' => (string) $pod['default_split_method'],
            ],
            'viewerName' => (string) $authUser['fullName'],
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
