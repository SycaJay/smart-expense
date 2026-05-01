<?php

declare(strict_types=1);

/**
 * Load simple KEY=VALUE entries from backend/.env into process env.
 */
function loadEnvFile(string $path): void
{
    if (!is_file($path) || !is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return;
    }

    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#')) {
            continue;
        }

        $parts = explode('=', $trimmed, 2);
        if (count($parts) !== 2) {
            continue;
        }

        $key = trim($parts[0]);
        $value = trim($parts[1]);
        $value = trim($value, "\"'");

        if ($key === '') {
            continue;
        }

        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}

loadEnvFile(dirname(__DIR__) . '/.env');

spl_autoload_register(static function (string $class): void {
    $base = dirname(__DIR__) . '/lib/';
    $file = $base . $class . '.php';
    $lowercaseFile = $base . strtolower($class) . '.php';
    if (is_file($file)) {
        require $file;
        return;
    }

    if (is_file($lowercaseFile)) {
        require $lowercaseFile;
    }
});

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['SERVER_PORT'] ?? null) === '443');
session_set_cookie_params([
    'lifetime' => 60 * 60 * 24 * 7,
    'path' => '/',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Lax',
]);
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$configPath = dirname(__DIR__) . '/config/config.php';
$corsOrigin = null;
if (is_file($configPath)) {
    /** @var array{cors?: array{allow_origin?: string}} $app */
    $app = require $configPath;
    $corsOrigin = $app['cors']['allow_origin'] ?? null;
}

Http::applyCors($corsOrigin);
