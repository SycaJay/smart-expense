<?php

declare(strict_types=1);

final class Database
{
    private static ?\PDO $pdo = null;

    public static function pdo(): \PDO
    {
        if (self::$pdo instanceof \PDO) {
            return self::$pdo;
        }

        $configPath = dirname(__DIR__) . '/config/config.php';
        if (!is_file($configPath)) {
            throw new \RuntimeException('Missing backend/config/config.php — create it (see README.md).');
        }

        /** @var array{db: array{host: string, name: string, user: string, pass: string, charset: string, port?: int}} $cfg */
        $cfg = require $configPath;
        $db = $cfg['db'];

        if (isset($db['port']) && (int) $db['port'] > 0) {
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                $db['host'],
                (int) $db['port'],
                $db['name'],
                $db['charset']
            );
        } else {
            $dsn = sprintf(
                'mysql:host=%s;dbname=%s;charset=%s',
                $db['host'],
                $db['name'],
                $db['charset']
            );
        }

        self::$pdo = new \PDO($dsn, $db['user'], $db['pass'], [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
        ]);

        return self::$pdo;
    }
}
