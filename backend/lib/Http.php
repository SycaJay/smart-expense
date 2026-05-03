<?php

declare(strict_types=1);

final class Http
{
    public static function json(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }

    public static function applyCors(?string $allowOrigin): void
    {
        if ($allowOrigin === null || $allowOrigin === '') {
            return;
        }
        header('Access-Control-Allow-Origin: ' . $allowOrigin);
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
    }

    public static function requireAuthUser(): array
    {
        $raw = $_SESSION['auth_user'] ?? null;
        if (!is_array($raw)) {
            self::json(['error' => 'Unauthorized'], 401);
            exit;
        }

        return [
            'id' => (int) ($raw['id'] ?? 0),
            'firstName' => (string) ($raw['firstName'] ?? ''),
            'lastName' => (string) ($raw['lastName'] ?? ''),
            'email' => (string) ($raw['email'] ?? ''),
            'phone' => (string) ($raw['phone'] ?? ''),
        ];
    }
}
