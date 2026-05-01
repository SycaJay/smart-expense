<?php

declare(strict_types=1);

/**
 * GET /api/pods — list pods (requires `pods` table from project root smart_expense.sql)
 */
try {
    $pdo = Database::pdo();
    $sql = <<<SQL
        SELECT
            p.pod_id,
            p.pod_name,
            p.pod_type,
            p.invite_code,
            p.currency,
            p.default_split_method,
            p.planned_member_count,
            p.created_by_user_id,
            p.created_at,
            p.updated_at
        FROM pods p
        ORDER BY p.pod_id ASC
SQL;
    $rows = $pdo->query($sql)->fetchAll();
    Http::json(['data' => $rows]);
} catch (Throwable $e) {
    Http::json(
        [
            'error' => 'Database unavailable',
            'detail' => $e->getMessage(),
        ],
        503
    );
}
