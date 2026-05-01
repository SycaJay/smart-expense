<?php

declare(strict_types=1);

// POST /api/pod-invites — admin, SMTP.
$authUser = Http::requireAuthUser();
$viewerId = (int) $authUser['id'];

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

$podId = (int) ($input['podId'] ?? 0);
$inviteCode = strtoupper(trim((string) ($input['inviteCode'] ?? '')));
$emailsRaw = $input['emails'] ?? [];
$customMessage = trim((string) ($input['message'] ?? ''));

if (!is_array($emailsRaw) || $emailsRaw === []) {
    Http::json(['error' => 'emails array is required'], 422);
    return;
}

$emails = [];
foreach ($emailsRaw as $candidate) {
    $email = strtolower(trim((string) $candidate));
    if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $emails[] = $email;
    }
}
$emails = array_values(array_unique($emails));
if ($emails === []) {
    Http::json(['error' => 'No valid emails found'], 422);
    return;
}

try {
    $pdo = Database::pdo();

    $missingMailKeys = Mailer::missingConfigKeys();
    if ($missingMailKeys !== []) {
        Http::json([
            'error' => 'Invite email service is not configured',
            'detail' => 'Missing mail environment variables: ' . implode(', ', $missingMailKeys),
        ], 503);
        return;
    }

    if ($podId <= 0 && $inviteCode !== '') {
        $podByCode = $pdo->prepare('SELECT pod_id FROM pods WHERE invite_code = :invite_code LIMIT 1');
        $podByCode->execute([':invite_code' => $inviteCode]);
        $row = $podByCode->fetch();
        if (is_array($row)) {
            $podId = (int) $row['pod_id'];
        }
    }

    if ($podId <= 0) {
        Http::json(['error' => 'podId or inviteCode is required'], 422);
        return;
    }

    $accessStmt = $pdo->prepare(
        'SELECT p.pod_name, p.invite_code, p.pod_status, pm.member_role
         FROM pods p
         INNER JOIN pod_members pm ON pm.pod_id = p.pod_id
         WHERE p.pod_id = :pod_id AND pm.user_id = :viewer_id
         LIMIT 1'
    );
    $accessStmt->execute([':pod_id' => $podId, ':viewer_id' => $viewerId]);
    $access = $accessStmt->fetch();
    if (!is_array($access)) {
        Http::json(['error' => 'You are not a member of this pod'], 403);
        return;
    }
    if ((string) $access['member_role'] !== 'admin') {
        Http::json(['error' => 'Only pod admins can send invites'], 403);
        return;
    }
    if ((string) $access['pod_status'] === 'archived') {
        Http::json(['error' => 'Archived pods cannot send new invites'], 422);
        return;
    }

    $podName = (string) $access['pod_name'];
    $inviteCodeFinal = (string) $access['invite_code'];
    $adminName = (string) $authUser['fullName'];
    $frontendBase = rtrim((string) getenv('FRONTEND_BASE_URL'), '/');
    $joinUrl = $frontendBase !== ''
        ? ($frontendBase . '/?invite=' . rawurlencode($inviteCodeFinal))
        : '';

    $subject = 'You are invited to join ' . $podName . ' on Smart Expense';

    $sent = [];
    /** @var array<int, array{email:string,reason:string}> $failed */
    $failed = [];

    foreach ($emails as $recipient) {
        $niceMessage = nl2br(htmlspecialchars($customMessage, ENT_QUOTES, 'UTF-8'));
        $joinLine = $joinUrl !== ''
            ? '<p><a href="' . htmlspecialchars($joinUrl, ENT_QUOTES, 'UTF-8') . '">Tap here to open Smart Expense and join</a></p>'
            : '';

        $body = '
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
              <h2 style="margin:0 0 12px;">You are invited to a Smart Expense pod</h2>
              <p><strong>' . htmlspecialchars($adminName, ENT_QUOTES, 'UTF-8') . '</strong> invited you to join <strong>' . htmlspecialchars($podName, ENT_QUOTES, 'UTF-8') . '</strong>.</p>
              <p>Use this invite code: <strong style="font-size:18px;">' . htmlspecialchars($inviteCodeFinal, ENT_QUOTES, 'UTF-8') . '</strong></p>
              ' . $joinLine . '
              ' . ($niceMessage !== '' ? ('<p><strong>Message from admin:</strong><br>' . $niceMessage . '</p>') : '') . '
              <p>After you join, you will review the pod sharing rules before participating.</p>
              <p style="margin-top:20px;">- Smart Expense Team</p>
            </div>
        ';
        $plain = "You are invited to join {$podName} on Smart Expense.\n"
            . "{$adminName} invited you.\n"
            . "Invite code: {$inviteCodeFinal}\n"
            . ($joinUrl !== '' ? "Join link: {$joinUrl}\n" : '')
            . ($customMessage !== '' ? "Message from admin: {$customMessage}\n" : '')
            . "Smart Expense Team";

        if (Mailer::send($recipient, $recipient, $subject, $body, $plain)) {
            $sent[] = $recipient;
        } else {
            $failed[] = [
                'email' => $recipient,
                'reason' => Mailer::lastError() !== '' ? Mailer::lastError() : 'Unknown mail send error',
            ];
        }
    }

    Http::json([
        'ok' => true,
        'message' => $failed === [] ? 'Invite emails sent successfully' : 'Invite emails processed with some failures',
        'data' => [
            'podId' => $podId,
            'sent' => $sent,
            'failed' => $failed,
        ],
    ]);
} catch (Throwable $e) {
    Http::json(['error' => 'Failed to send invite emails', 'detail' => $e->getMessage()], 503);
}
