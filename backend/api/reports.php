<?php

declare(strict_types=1);

// GET /api/reports ?podId=&type=&format= (json|csv|pdf)
$authUser = Http::requireAuthUser();
$viewerId = (int) $authUser['id'];

$podId = (int) ($_GET['podId'] ?? 0);
$inviteCode = strtoupper(trim((string) ($_GET['inviteCode'] ?? '')));
$type = trim((string) ($_GET['type'] ?? 'weekly'));
$format = trim((string) ($_GET['format'] ?? 'json'));

if (!in_array($type, ['weekly', 'monthly', 'category', 'settlement'], true)) {
    Http::json(['error' => 'type must be weekly, monthly, category, or settlement'], 422);
    return;
}
if (!in_array($format, ['json', 'csv', 'pdf'], true)) {
    Http::json(['error' => 'format must be json, csv, or pdf'], 422);
    return;
}

try {
    $pdo = Database::pdo();

    if ($podId <= 0 && $inviteCode !== '') {
        $podStmt = $pdo->prepare('SELECT pod_id FROM pods WHERE invite_code = :invite_code LIMIT 1');
        $podStmt->execute([':invite_code' => $inviteCode]);
        $pod = $podStmt->fetch();
        if (is_array($pod)) {
            $podId = (int) $pod['pod_id'];
        }
    }
    if ($podId <= 0) {
        Http::json(['error' => 'podId or inviteCode is required'], 422);
        return;
    }

    $memberStmt = $pdo->prepare(
        'SELECT pod_member_id FROM pod_members WHERE pod_id = :pod_id AND user_id = :user_id LIMIT 1'
    );
    $memberStmt->execute([':pod_id' => $podId, ':user_id' => $viewerId]);
    if ($memberStmt->fetch() === false) {
        Http::json(['error' => 'Only pod members can view reports'], 403);
        return;
    }

    $podMetaStmt = $pdo->prepare('SELECT pod_name, currency FROM pods WHERE pod_id = :pod_id LIMIT 1');
    $podMetaStmt->execute([':pod_id' => $podId]);
    $podMeta = $podMetaStmt->fetch();
    $podName = is_array($podMeta) ? (string) $podMeta['pod_name'] : 'Pod';
    $currency = is_array($podMeta) ? (string) $podMeta['currency'] : 'USD';

    if ($type === 'weekly') {
        $rangeEnd = new DateTimeImmutable('today');
        $rangeStart = $rangeEnd->modify('-6 days');
        $start = $rangeStart->format('Y-m-d');
        $end = $rangeEnd->format('Y-m-d');

        $expenseStmt = $pdo->prepare(
            'SELECT DATE(expense_date) AS day_key, COUNT(*) AS bills, COALESCE(SUM(amount), 0) AS total
             FROM expenses
             WHERE pod_id = :pod_id AND expense_date BETWEEN :start_date AND :end_date
             GROUP BY DATE(expense_date)
             ORDER BY DATE(expense_date) ASC'
        );
        $expenseStmt->execute([':pod_id' => $podId, ':start_date' => $start, ':end_date' => $end]);
        $expenseRows = $expenseStmt->fetchAll();
        $expenseMap = [];
        foreach ($expenseRows as $row) {
            $expenseMap[(string) $row['day_key']] = [
                'bills' => (int) $row['bills'],
                'spent' => (float) $row['total'],
            ];
        }

        $paymentStmt = $pdo->prepare(
            'SELECT DATE(pr.paid_at) AS day_key, COALESCE(SUM(pr.amount), 0) AS total
             FROM payment_records pr
             INNER JOIN settlement_transfers st ON st.transfer_id = pr.transfer_id
             INNER JOIN settlement_plans sp ON sp.settlement_plan_id = st.settlement_plan_id
             WHERE sp.pod_id = :pod_id AND DATE(pr.paid_at) BETWEEN :start_date AND :end_date
             GROUP BY DATE(pr.paid_at)
             ORDER BY DATE(pr.paid_at) ASC'
        );
        $paymentStmt->execute([':pod_id' => $podId, ':start_date' => $start, ':end_date' => $end]);
        $paymentRows = $paymentStmt->fetchAll();
        $paymentMap = [];
        foreach ($paymentRows as $row) {
            $paymentMap[(string) $row['day_key']] = (float) $row['total'];
        }

        $days = [];
        $weeklySpent = 0.0;
        $weeklyBills = 0;
        $weeklySettled = 0.0;
        for ($cursor = $rangeStart; $cursor <= $rangeEnd; $cursor = $cursor->modify('+1 day')) {
            $key = $cursor->format('Y-m-d');
            $spent = (float) (($expenseMap[$key]['spent'] ?? 0.0));
            $bills = (int) (($expenseMap[$key]['bills'] ?? 0));
            $settled = (float) ($paymentMap[$key] ?? 0.0);
            $days[] = [
                'date' => $key,
                'label' => $cursor->format('D'),
                'spent' => $spent,
                'bills' => $bills,
                'settled' => $settled,
            ];
            $weeklySpent += $spent;
            $weeklyBills += $bills;
            $weeklySettled += $settled;
        }

        $payload = [
            'ok' => true,
            'data' => [
                'type' => 'weekly',
                'podId' => $podId,
                'podName' => $podName,
                'currency' => $currency,
                'range' => ['start' => $start, 'end' => $end],
                'summary' => [
                    'totalSpent' => round($weeklySpent, 2),
                    'totalBills' => $weeklyBills,
                    'totalSettled' => round($weeklySettled, 2),
                ],
                'days' => $days,
            ],
        ];
        if ($format === 'json') {
            Http::json($payload);
            return;
        }
        $rows = [['Date', 'Day', 'Bills', 'Spent', 'Settled']];
        foreach ($days as $day) {
            $rows[] = [
                (string) $day['date'],
                (string) $day['label'],
                (string) $day['bills'],
                number_format((float) $day['spent'], 2, '.', ''),
                number_format((float) $day['settled'], 2, '.', ''),
            ];
        }
        if ($format === 'csv') {
            sendCsv("weekly-report-pod-{$podId}.csv", $rows);
            return;
        }
        $lines = [
            "Pod: {$podName}",
            "Report: Weekly",
            "Range: {$start} to {$end}",
            "Currency: {$currency}",
            "Total spent: " . number_format((float) $weeklySpent, 2, '.', ''),
            "Total bills: {$weeklyBills}",
            "Total settled: " . number_format((float) $weeklySettled, 2, '.', ''),
            '',
            'Date | Day | Bills | Spent | Settled',
        ];
        foreach ($days as $day) {
            $lines[] = sprintf(
                '%s | %s | %d | %s | %s',
                (string) $day['date'],
                (string) $day['label'],
                (int) $day['bills'],
                number_format((float) $day['spent'], 2, '.', ''),
                number_format((float) $day['settled'], 2, '.', '')
            );
        }
        sendSimplePdf("weekly-report-pod-{$podId}.pdf", 'Weekly Report', $lines);
        return;
    }

    if ($type === 'monthly') {
        $stmt = $pdo->prepare(
            'SELECT DATE_FORMAT(expense_date, "%Y-%m") AS month_key, COUNT(*) AS bills, COALESCE(SUM(amount), 0) AS total
             FROM expenses
             WHERE pod_id = :pod_id
             GROUP BY DATE_FORMAT(expense_date, "%Y-%m")
             ORDER BY month_key DESC'
        );
        $stmt->execute([':pod_id' => $podId]);
        $rowsData = $stmt->fetchAll();
        if ($format === 'json') {
            Http::json(['ok' => true, 'data' => ['type' => 'monthly', 'rows' => $rowsData, 'currency' => $currency]]);
            return;
        }
        $rows = [['Month', 'Bills', 'Total']];
        foreach ($rowsData as $r) {
            $rows[] = [(string) $r['month_key'], (string) $r['bills'], number_format((float) $r['total'], 2, '.', '')];
        }
        if ($format === 'csv') {
            sendCsv("monthly-summary-pod-{$podId}.csv", $rows);
            return;
        }
        $lines = [
            "Pod: {$podName}",
            'Report: Monthly Summary',
            "Currency: {$currency}",
            '',
            'Month | Bills | Total',
        ];
        foreach ($rowsData as $r) {
            $lines[] = sprintf(
                '%s | %s | %s',
                (string) $r['month_key'],
                (string) $r['bills'],
                number_format((float) $r['total'], 2, '.', '')
            );
        }
        sendSimplePdf("monthly-summary-pod-{$podId}.pdf", 'Monthly Summary', $lines);
        return;
    }

    if ($type === 'category') {
        $stmt = $pdo->prepare(
            'SELECT COALESCE(pc.category_label, "Other") AS category, COUNT(*) AS bills, COALESCE(SUM(e.amount), 0) AS total
             FROM expenses e
             LEFT JOIN pod_categories pc ON pc.pod_category_id = e.pod_category_id
             WHERE e.pod_id = :pod_id
             GROUP BY COALESCE(pc.category_label, "Other")
             ORDER BY total DESC'
        );
        $stmt->execute([':pod_id' => $podId]);
        $rowsData = $stmt->fetchAll();
        if ($format === 'json') {
            Http::json(['ok' => true, 'data' => ['type' => 'category', 'rows' => $rowsData, 'currency' => $currency]]);
            return;
        }
        $rows = [['Category', 'Bills', 'Total']];
        foreach ($rowsData as $r) {
            $rows[] = [(string) $r['category'], (string) $r['bills'], number_format((float) $r['total'], 2, '.', '')];
        }
        if ($format === 'csv') {
            sendCsv("category-breakdown-pod-{$podId}.csv", $rows);
            return;
        }
        $lines = [
            "Pod: {$podName}",
            'Report: Category Breakdown',
            "Currency: {$currency}",
            '',
            'Category | Bills | Total',
        ];
        foreach ($rowsData as $r) {
            $lines[] = sprintf(
                '%s | %s | %s',
                (string) $r['category'],
                (string) $r['bills'],
                number_format((float) $r['total'], 2, '.', '')
            );
        }
        sendSimplePdf("category-breakdown-pod-{$podId}.pdf", 'Category Breakdown', $lines);
        return;
    }

    $stmt = $pdo->prepare(
        'SELECT pr.paid_at, payer.full_name AS payer, receiver.full_name AS receiver, pr.amount
         FROM payment_records pr
         INNER JOIN settlement_transfers st ON st.transfer_id = pr.transfer_id
         INNER JOIN settlement_plans sp ON sp.settlement_plan_id = st.settlement_plan_id
         INNER JOIN users payer ON payer.user_id = pr.payer_user_id
         INNER JOIN users receiver ON receiver.user_id = pr.receiver_user_id
         WHERE sp.pod_id = :pod_id
         ORDER BY pr.paid_at DESC, pr.payment_id DESC'
    );
    $stmt->execute([':pod_id' => $podId]);
    $rowsData = $stmt->fetchAll();
    if ($format === 'json') {
        Http::json(['ok' => true, 'data' => ['type' => 'settlement', 'rows' => $rowsData, 'currency' => $currency]]);
        return;
    }
    $rows = [['Paid At', 'Payer', 'Receiver', 'Amount']];
    foreach ($rowsData as $r) {
        $rows[] = [
            (string) $r['paid_at'],
            (string) $r['payer'],
            (string) $r['receiver'],
            number_format((float) $r['amount'], 2, '.', ''),
        ];
    }
    if ($format === 'csv') {
        sendCsv("settlement-history-pod-{$podId}.csv", $rows);
        return;
    }
    $lines = [
        "Pod: {$podName}",
        'Report: Settlement History',
        "Currency: {$currency}",
        '',
        'Paid At | Payer | Receiver | Amount',
    ];
    foreach ($rowsData as $r) {
        $lines[] = sprintf(
            '%s | %s | %s | %s',
            (string) $r['paid_at'],
            (string) $r['payer'],
            (string) $r['receiver'],
            number_format((float) $r['amount'], 2, '.', '')
        );
    }
    sendSimplePdf("settlement-history-pod-{$podId}.pdf", 'Settlement History', $lines);
} catch (Throwable $e) {
    Http::json(['error' => 'Unable to generate report', 'detail' => $e->getMessage()], 503);
}

// Minimal PDF-1.4 (Helvetica, one page) — no composer PDF lib.
function sendSimplePdf(string $filename, string $title, array $lines): void
{
    $pageWidth = 595;
    $pageHeight = 842;
    $lineHeight = 14;
    $x = 40;
    $yStart = 800;
    $maxLines = 50;
    $slice = array_slice($lines, 0, $maxLines);

    $streamParts = [];
    $streamParts[] = 'BT';
    $streamParts[] = '/F1 12 Tf';
    $streamParts[] = sprintf('%d %d Td', $x, $yStart);
    $streamParts[] = '(' . pdfEscape($title) . ') Tj';
    $streamParts[] = sprintf('0 -%d Td', $lineHeight);
    foreach ($slice as $line) {
        $streamParts[] = '(' . pdfEscape($line) . ') Tj';
        $streamParts[] = sprintf('0 -%d Td', $lineHeight);
    }
    $streamParts[] = 'ET';
    $stream = implode("\n", $streamParts);

    $objects = [];
    $objects[] = '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj';
    $objects[] = '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj';
    $objects[] = sprintf(
        '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 %d %d] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
        $pageWidth,
        $pageHeight
    );
    $objects[] = '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj';
    $objects[] = sprintf(
        "5 0 obj << /Length %d >> stream\n%s\nendstream endobj",
        strlen($stream),
        $stream
    );

    $pdf = "%PDF-1.4\n";
    $offsets = [0];
    foreach ($objects as $obj) {
        $offsets[] = strlen($pdf);
        $pdf .= $obj . "\n";
    }
    $xrefOffset = strlen($pdf);
    $pdf .= "xref\n0 " . (count($objects) + 1) . "\n";
    $pdf .= "0000000000 65535 f \n";
    for ($i = 1; $i <= count($objects); $i++) {
        $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
    }
    $pdf .= "trailer << /Size " . (count($objects) + 1) . " /Root 1 0 R >>\n";
    $pdf .= "startxref\n{$xrefOffset}\n%%EOF";

    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    echo $pdf;
}

function pdfEscape(string $text): string
{
    return str_replace(
        ["\\", "(", ")", "\r", "\n"],
        ["\\\\", "\\(", "\\)", ' ', ' '],
        $text
    );
}

function sendCsv(string $filename, array $rows): void
{
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    $out = fopen('php://output', 'wb');
    if ($out === false) {
        http_response_code(500);
        echo 'Could not open output stream.';
        return;
    }
    foreach ($rows as $row) {
        fputcsv($out, $row);
    }
    fclose($out);
}
