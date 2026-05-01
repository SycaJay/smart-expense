<?php

declare(strict_types=1);

/**
 * POST /api/payment-notify
 * Sends settlement payment notification emails.
 */
$authUser = Http::requireAuthUser();
$payerId = (int) $authUser['id'];

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
$receiverUserId = (int) ($input['receiverUserId'] ?? 0);
$amount = (float) ($input['amount'] ?? 0);
$currency = strtoupper(trim((string) ($input['currency'] ?? 'USD')));
$note = trim((string) ($input['note'] ?? ''));

if ($podId <= 0 || $receiverUserId <= 0 || $amount <= 0) {
    Http::json(['error' => 'podId, receiverUserId and amount are required'], 422);
    return;
}

try {
    $pdo = Database::pdo();

    $podStmt = $pdo->prepare('SELECT pod_name FROM pods WHERE pod_id = :pod_id LIMIT 1');
    $podStmt->execute([':pod_id' => $podId]);
    $pod = $podStmt->fetch();
    if (!is_array($pod)) {
        Http::json(['error' => 'Pod not found'], 404);
        return;
    }
    $podName = (string) $pod['pod_name'];

    $memberStmt = $pdo->prepare(
        'SELECT pm.user_id, u.full_name, u.email
         FROM pod_members pm
         INNER JOIN users u ON u.user_id = pm.user_id
         WHERE pm.pod_id = :pod_id AND pm.user_id IN (:payer_id, :receiver_id)'
    );
    $memberStmt->bindValue(':pod_id', $podId, PDO::PARAM_INT);
    $memberStmt->bindValue(':payer_id', $payerId, PDO::PARAM_INT);
    $memberStmt->bindValue(':receiver_id', $receiverUserId, PDO::PARAM_INT);
    $memberStmt->execute();
    $rows = $memberStmt->fetchAll();

    $payer = null;
    $receiver = null;
    foreach ($rows as $row) {
        $id = (int) $row['user_id'];
        if ($id === $payerId) {
            $payer = $row;
        }
        if ($id === $receiverUserId) {
            $receiver = $row;
        }
    }

    if (!is_array($payer) || !is_array($receiver)) {
        Http::json(['error' => 'Both payer and receiver must be pod members'], 403);
        return;
    }

    $payerName = (string) $payer['full_name'];
    $receiverName = (string) $receiver['full_name'];
    $receiverEmail = strtolower(trim((string) $receiver['email']));
    $payerEmail = strtolower(trim((string) $payer['email']));
    $amountLabel = number_format($amount, 2);
    $safeNote = htmlspecialchars($note, ENT_QUOTES, 'UTF-8');

    $subjectReceiver = 'Settlement payment marked in ' . $podName;
    $bodyReceiver = '
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
          <h2 style="margin:0 0 12px;">Payment update</h2>
          <p><strong>' . htmlspecialchars($payerName, ENT_QUOTES, 'UTF-8') . '</strong> marked a settlement payment to you in <strong>' . htmlspecialchars($podName, ENT_QUOTES, 'UTF-8') . '</strong>.</p>
          <p>Amount: <strong>' . htmlspecialchars($currency, ENT_QUOTES, 'UTF-8') . ' ' . $amountLabel . '</strong></p>
          ' . ($safeNote !== '' ? ('<p>Note: ' . $safeNote . '</p>') : '') . '
          <p>Open your Smart Expense dashboard to confirm and keep balances up to date.</p>
          <p style="margin-top:20px;">- Smart Expense Team</p>
        </div>
    ';
    $plainReceiver = "{$payerName} marked a settlement payment to you in {$podName}.\n"
        . "Amount: {$currency} {$amountLabel}\n"
        . ($note !== '' ? "Note: {$note}\n" : '')
        . "Smart Expense Team";

    $subjectPayer = 'Settlement payment recorded for ' . $podName;
    $bodyPayer = '
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
          <h2 style="margin:0 0 12px;">Payment recorded</h2>
          <p>You marked a settlement payment in <strong>' . htmlspecialchars($podName, ENT_QUOTES, 'UTF-8') . '</strong>.</p>
          <p><strong>' . htmlspecialchars($receiverName, ENT_QUOTES, 'UTF-8') . '</strong> will receive <strong>' . htmlspecialchars($currency, ENT_QUOTES, 'UTF-8') . ' ' . $amountLabel . '</strong>.</p>
          ' . ($safeNote !== '' ? ('<p>Note: ' . $safeNote . '</p>') : '') . '
          <p style="margin-top:20px;">- Smart Expense Team</p>
        </div>
    ';
    $plainPayer = "You marked a settlement payment in {$podName}.\n"
        . "{$receiverName} will receive {$currency} {$amountLabel}.\n"
        . ($note !== '' ? "Note: {$note}\n" : '')
        . "Smart Expense Team";

    $receiverSent = false;
    $payerSent = false;

    if ($receiverEmail !== '' && filter_var($receiverEmail, FILTER_VALIDATE_EMAIL)) {
        $receiverSent = Mailer::send($receiverEmail, $receiverName, $subjectReceiver, $bodyReceiver, $plainReceiver);
    }
    if ($payerEmail !== '' && filter_var($payerEmail, FILTER_VALIDATE_EMAIL)) {
        $payerSent = Mailer::send($payerEmail, $payerName, $subjectPayer, $bodyPayer, $plainPayer);
    }

    Http::json([
        'ok' => true,
        'message' => 'Payment notifications processed',
        'data' => [
            'receiverEmailSent' => $receiverSent,
            'payerEmailSent' => $payerSent,
        ],
    ]);
} catch (Throwable $e) {
    Http::json(['error' => 'Failed to notify payment', 'detail' => $e->getMessage()], 503);
}
