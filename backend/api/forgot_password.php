<?php

declare(strict_types=1);

// POST /api/forgot-password — request reset email (no auth).

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

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    Http::json(['error' => 'A valid email address is required'], 422);
    return;
}

if (!class_exists('Mailer') || !Mailer::isConfigured()) {
    Http::json([
        'error' => 'Password reset email is not available',
        'detail' => 'Mail is not configured on this server (set MAIL_* and FRONTEND_BASE_URL in the environment).',
    ], 503);
    return;
}

$genericOk = [
    'ok' => true,
    'message' => 'If an account exists for that email, you will receive reset instructions shortly.',
];

try {
    $pdo = Database::pdo();

    $stmt = $pdo->prepare('SELECT user_id, first_name, last_name FROM users WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    $row = $stmt->fetch();
    if (!is_array($row)) {
        Http::json($genericOk);
        return;
    }

    $userId = (int) $row['user_id'];
    $name = UserDisplay::format((string) $row['first_name'], (string) $row['last_name']);
    if ($name === '') {
        $name = $email;
    }

    $rawToken = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $rawToken, false);
    $expires = (new DateTimeImmutable('+1 hour'))->format('Y-m-d H:i:s');

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM password_reset_tokens WHERE user_id = :user_id')->execute([':user_id' => $userId]);
        $ins = $pdo->prepare(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (:user_id, :token_hash, :expires_at)'
        );
        $ins->execute([
            ':user_id' => $userId,
            ':token_hash' => $tokenHash,
            ':expires_at' => $expires,
        ]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    $base = rtrim((string) getenv('FRONTEND_BASE_URL'), '/');
    if ($base === '') {
        $pdo->prepare('DELETE FROM password_reset_tokens WHERE user_id = :user_id')->execute([':user_id' => $userId]);
        Http::json([
            'error' => 'Password reset is misconfigured',
            'detail' => 'FRONTEND_BASE_URL is not set; cannot build the reset link in the email.',
        ], 503);
        return;
    }

    $resetUrl = $base . '/?pwdreset=' . rawurlencode($rawToken);

    $subject = 'Reset your Smart Expense password';
    $body = '
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
          <h2 style="margin:0 0 12px;">Password reset</h2>
          <p>We received a request to reset the password for your Smart Expense account.</p>
          <p><a href="' . htmlspecialchars($resetUrl, ENT_QUOTES, 'UTF-8') . '">Choose a new password</a> (link expires in one hour).</p>
          <p>If you did not ask for this, you can ignore this email.</p>
          <p style="margin-top:20px;">- Smart Expense Team</p>
        </div>
    ';
    $plain = "Password reset for Smart Expense.\nOpen this link to choose a new password (expires in one hour):\n{$resetUrl}\n\nIf you did not request this, ignore this email.\n";

    if (!Mailer::send($email, $name, $subject, $body, $plain)) {
        $pdo->prepare('DELETE FROM password_reset_tokens WHERE user_id = :user_id')->execute([':user_id' => $userId]);
        Http::json([
            'error' => 'Could not send reset email',
            'detail' => Mailer::lastError(),
        ], 503);
        return;
    }

    Http::json($genericOk);
} catch (Throwable $e) {
    $msg = $e->getMessage();
    if (str_contains($msg, 'password_reset_tokens') || str_contains($msg, "doesn't exist")) {
        Http::json([
            'error' => 'Database needs migration',
            'detail' => 'Create the password_reset_tokens table (see migrate_password_reset_tokens.sql in the project root).',
        ], 503);
        return;
    }
    Http::json(['error' => 'Database unavailable', 'detail' => $msg], 503);
}
