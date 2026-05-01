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

// Simple router: /api/health, /api/households, ...
$routes = [
    'GET' => [
        '/api/health' => dirname(__DIR__) . '/api/health.php',
        '/api/pods' => dirname(__DIR__) . '/api/pods.php',
        '/api/me' => dirname(__DIR__) . '/api/me.php',
        '/api/pod-dashboard' => dirname(__DIR__) . '/api/pod_dashboard.php',
    ],
    'POST' => [
        '/api/signups' => dirname(__DIR__) . '/api/signups.php',
        '/api/login' => dirname(__DIR__) . '/api/login.php',
        '/api/logout' => dirname(__DIR__) . '/api/logout.php',
        '/api/expenses' => dirname(__DIR__) . '/api/expenses.php',
        '/api/pod-invites' => dirname(__DIR__) . '/api/pod_invites.php',
        '/api/payment-notify' => dirname(__DIR__) . '/api/payment_notify.php',
    ],
];

$methodRoutes = $routes[$method] ?? [];
$file = $methodRoutes[$path] ?? null;

if ($file === null || !is_file($file)) {
    Http::json(['error' => 'Not found', 'path' => $path], 404);
    exit;
}

require $file;
