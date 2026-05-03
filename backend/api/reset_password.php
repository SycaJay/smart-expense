<?php

declare(strict_types=1);

// POST /api/reset-password — set a new password using a token from email.

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

$token = trim((string) ($input['token'] ?? ''));
$password = (string) ($input['password'] ?? '');

if (strlen($token) < 32) {
    Http::json(['error' => 'Reset token is missing or invalid'], 422);
    return;
}

if (strlen($password) < 8) {
    Http::json(['error' => 'Password must be at least 8 characters'], 422);
    return;
}

$tokenHash = hash('sha256', $token, false);

$pdo = null;
try {
    $pdo = Database::pdo();
    $pdo->beginTransaction();

    $find = $pdo->prepare(
        'SELECT user_id FROM password_reset_tokens WHERE token_hash = :h AND expires_at > NOW() LIMIT 1'
    );
    $find->execute([':h' => $tokenHash]);
    $row = $find->fetch();
    if (!is_array($row)) {
        $pdo->rollBack();
        Http::json(['error' => 'This reset link is invalid or has expired. Request a new one.'], 400);
        return;
    }

    $userId = (int) $row['user_id'];

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    if ($passwordHash === false) {
        $pdo->rollBack();
        Http::json(['error' => 'Unable to process password'], 500);
        return;
    }

    $upd = $pdo->prepare('UPDATE users SET password_hash = :hash WHERE user_id = :user_id');
    $upd->execute([':hash' => $passwordHash, ':user_id' => $userId]);

    $pdo->prepare('DELETE FROM password_reset_tokens WHERE user_id = :user_id')->execute([':user_id' => $userId]);

    $pdo->commit();

    Http::json([
        'ok' => true,
        'message' => 'Your password has been updated. You can log in with your new password.',
    ]);
} catch (Throwable $e) {
    if ($pdo instanceof \PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $msg = $e->getMessage();
    if (str_contains($msg, 'password_reset_tokens') || str_contains($msg, "doesn't exist")) {
        Http::json([
            'error' => 'Database needs migration',
            'detail' => 'Create the password_reset_tokens table (see migrate_password_reset_tokens.sql).',
        ], 503);
        return;
    }
    Http::json(['error' => 'Database unavailable', 'detail' => $msg], 503);
}
