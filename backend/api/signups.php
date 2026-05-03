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

$firstName = trim((string) ($input['firstName'] ?? ''));
$lastName = trim((string) ($input['lastName'] ?? ''));
$email = trim((string) ($input['email'] ?? ''));
$password = (string) ($input['password'] ?? '');

$phoneDial = preg_replace('/\D+/', '', (string) ($input['phoneDial'] ?? ''));
$phoneNational = preg_replace('/\D+/', '', (string) ($input['phoneNational'] ?? ''));
$phoneLegacy = trim((string) ($input['phone'] ?? ''));

$phone = '';
if ($phoneDial !== '' && $phoneNational !== '') {
    $phone = '+' . $phoneDial . $phoneNational;
} elseif ($phoneLegacy !== '') {
    $phone = $phoneLegacy;
}

if ($firstName === '' || $email === '' || $phone === '' || $password === '') {
    Http::json(['error' => 'firstName, email, phone (country + number), and password are required'], 422);
    return;
}

if (strlen($phone) > 32) {
    Http::json(['error' => 'Phone number is too long'], 422);
    return;
}

if ($phoneDial !== '' && $phoneNational !== '') {
    if (strlen($phoneDial) < 1 || strlen($phoneDial) > 4) {
        Http::json(['error' => 'Invalid country calling code'], 422);
        return;
    }
    if (strlen($phoneNational) < 5) {
        Http::json(['error' => 'Enter your phone number (at least 5 digits)'], 422);
        return;
    }
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    Http::json(['error' => 'Email format is invalid'], 422);
    return;
}

if (strlen($password) < 8) {
    Http::json(['error' => 'Password must be at least 8 characters'], 422);
    return;
}

$emailLower = strtolower($email);
$passwordHash = password_hash($password, PASSWORD_DEFAULT);
if ($passwordHash === false) {
    Http::json(['error' => 'Unable to process password'], 500);
    return;
}

try {
    $pdo = Database::pdo();
    $checkStmt = $pdo->prepare('SELECT user_id FROM users WHERE email = :email LIMIT 1');
    $checkStmt->execute([':email' => $emailLower]);
    $existing = $checkStmt->fetch();
    if ($existing !== false) {
        Http::json(['error' => 'An account with this email already exists'], 409);
        return;
    }

    $insert = $pdo->prepare(
        'INSERT INTO users (first_name, last_name, email, phone, password_hash) VALUES (:first_name, :last_name, :email, :phone, :password_hash)'
    );
    $insert->execute([
        ':first_name' => $firstName,
        ':last_name' => $lastName,
        ':email' => $emailLower,
        ':phone' => $phone,
        ':password_hash' => $passwordHash,
    ]);

    $userId = (int) $pdo->lastInsertId();

    Http::json([
        'ok' => true,
        'message' => 'Account created',
        'data' => [
            'id' => $userId,
            'firstName' => $firstName,
            'lastName' => $lastName,
            'email' => $emailLower,
            'phone' => $phone,
        ],
    ], 201);
} catch (Throwable $e) {
    Http::json([
        'error' => 'Database unavailable',
        'detail' => $e->getMessage(),
    ], 503);
}
