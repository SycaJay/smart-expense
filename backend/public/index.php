<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/lib/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = rtrim($path, '/') ?: '/';

$routes = [
    'GET' => [
        '/api/health' => dirname(__DIR__) . '/api/health.php',
        '/api/pods' => dirname(__DIR__) . '/api/pods.php',
        '/api/me' => dirname(__DIR__) . '/api/me.php',
        '/api/pod-dashboard' => dirname(__DIR__) . '/api/pod_dashboard.php',
        '/api/reports' => dirname(__DIR__) . '/api/reports.php',
        '/api/settlement-plans' => dirname(__DIR__) . '/api/settlement_plans.php',
    ],
    'POST' => [
        '/api/signups' => dirname(__DIR__) . '/api/signups.php',
        '/api/login' => dirname(__DIR__) . '/api/login.php',
        '/api/logout' => dirname(__DIR__) . '/api/logout.php',
        '/api/expenses' => dirname(__DIR__) . '/api/expenses.php',
        '/api/expense-update' => dirname(__DIR__) . '/api/expense_update.php',
        '/api/expense-delete' => dirname(__DIR__) . '/api/expense_delete.php',
        '/api/pod-update' => dirname(__DIR__) . '/api/pod_update.php',
        '/api/pod-member-role' => dirname(__DIR__) . '/api/pod_member_role.php',
        '/api/pod-member-remove' => dirname(__DIR__) . '/api/pod_member_remove.php',
        '/api/pod-leave' => dirname(__DIR__) . '/api/pod_leave.php',
        '/api/pod-close' => dirname(__DIR__) . '/api/pod_close.php',
        '/api/pod-split-policy-confirm' => dirname(__DIR__) . '/api/pod_split_policy_confirm.php',
        '/api/pod-invites' => dirname(__DIR__) . '/api/pod_invites.php',
        '/api/payment-notify' => dirname(__DIR__) . '/api/payment_notify.php',
        '/api/settlement-plan-open' => dirname(__DIR__) . '/api/settlement_plan_open.php',
        '/api/settlement-plan-reconcile' => dirname(__DIR__) . '/api/settlement_plan_reconcile.php',
    ],
];

$methodRoutes = $routes[$method] ?? [];
$file = $methodRoutes[$path] ?? null;

if ($file === null || !is_file($file)) {
    Http::json(['error' => 'Not found', 'path' => $path], 404);
    exit;
}

require $file;
