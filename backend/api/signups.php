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

$fullName = trim((string) ($input['fullName'] ?? ''));
$email = trim((string) ($input['email'] ?? ''));
$phone = trim((string) ($input['phone'] ?? ''));
$password = (string) ($input['password'] ?? '');

if ($fullName === '' || $email === '' || $phone === '' || $password === '') {
    Http::json(['error' => 'fullName, email, phone, and password are required'], 422);
    return;
}

$storageDir = dirname(__DIR__) . '/storage';
$storageFile = $storageDir . '/signups.json';

if (!is_dir($storageDir) && !mkdir($storageDir, 0777, true) && !is_dir($storageDir)) {
    Http::json(['error' => 'Unable to create storage directory'], 500);
    return;
}

$existing = [];
if (is_file($storageFile)) {
    $existingRaw = file_get_contents($storageFile);
    if ($existingRaw === false) {
        Http::json(['error' => 'Unable to read storage file'], 500);
        return;
    }
    if (trim($existingRaw) !== '') {
        try {
            $decoded = json_decode($existingRaw, true, 512, JSON_THROW_ON_ERROR);
            if (is_array($decoded)) {
                $existing = $decoded;
            }
        } catch (Throwable $e) {
            $existing = [];
        }
    }
}

$record = [
    'id' => uniqid('signup_', true),
    'fullName' => $fullName,
    'email' => $email,
    'phone' => $phone,
    'password' => $password,
    'createdAt' => date(DATE_ATOM),
];

$existing[] = $record;
$json = json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
if (file_put_contents($storageFile, $json . PHP_EOL, LOCK_EX) === false) {
    Http::json(['error' => 'Unable to write storage file'], 500);
    return;
}

Http::json([
    'ok' => true,
    'message' => 'Signup saved',
    'data' => [
        'id' => $record['id'],
        'fullName' => $record['fullName'],
        'email' => $record['email'],
        'phone' => $record['phone'],
        'createdAt' => $record['createdAt'],
    ],
], 201);
