<?php

declare(strict_types=1);

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

$email = strtolower(trim((string) ($input['email'] ?? '')));
$password = (string) ($input['password'] ?? '');

if ($email === '' || $password === '') {
    Http::json(['error' => 'email and password are required'], 422);
    return;
}

try {
    $pdo = Database::pdo();
    $stmt = $pdo->prepare(
        'SELECT user_id, first_name, last_name, email, phone, password_hash FROM users WHERE email = :email LIMIT 1'
    );
    $stmt->execute([':email' => $email]);
    $row = $stmt->fetch();

    if (!is_array($row) || !isset($row['password_hash']) || !password_verify($password, (string) $row['password_hash'])) {
        Http::json(['error' => 'Invalid email or password'], 401);
        return;
    }

    session_regenerate_id(true);
    $_SESSION['auth_user'] = [
        'id' => (int) $row['user_id'],
        'firstName' => (string) $row['first_name'],
        'lastName' => (string) $row['last_name'],
        'email' => (string) $row['email'],
        'phone' => (string) $row['phone'],
    ];

    Http::json([
        'ok' => true,
        'message' => 'Login successful',
        'data' => $_SESSION['auth_user'],
    ]);
} catch (Throwable $e) {
    Http::json([
        'error' => 'Database unavailable',
        'detail' => $e->getMessage(),
    ], 503);
}
