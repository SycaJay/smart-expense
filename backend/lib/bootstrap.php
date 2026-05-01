<?php

declare(strict_types=1);

spl_autoload_register(static function (string $class): void {
    $base = dirname(__DIR__) . '/lib/';
    $file = $base . $class . '.php';
    if (is_file($file)) {
        require $file;
    }
});

$configPath = dirname(__DIR__) . '/config/config.php';
$corsOrigin = null;
if (is_file($configPath)) {
    /** @var array{cors?: array{allow_origin?: string}} $app */
    $app = require $configPath;
    $corsOrigin = $app['cors']['allow_origin'] ?? null;
}

Http::applyCors($corsOrigin);
