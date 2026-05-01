<?php

declare(strict_types=1);

// POST /api/pod-split-policy-confirm — after someone leaves.
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
$policy = trim((string) ($input['policy'] ?? ''));
$noticeId = (int) ($input['noticeId'] ?? 0);

if ($podId <= 0 || $noticeId <= 0) {
    Http::json(['error' => 'podId and noticeId are required'], 422);
    return;
}
if (!in_array($policy, ['equal', 'keep_previous'], true)) {
    Http::json(['error' => 'policy must be equal or keep_previous'], 422);
    return;
}

try {
    $pdo = Database::pdo();
    $pdo->beginTransaction();

    $adminStmt = $pdo->prepare(
        'SELECT member_role
         FROM pod_members
         WHERE pod_id = :pod_id AND user_id = :user_id
         LIMIT 1'
    );
    $adminStmt->execute([':pod_id' => $podId, ':user_id' => $viewerId]);
    $admin = $adminStmt->fetch();
    if (!is_array($admin) || (string) $admin['member_role'] !== 'admin') {
        $pdo->rollBack();
        Http::json(['error' => 'Only pod admins can confirm split policy'], 403);
        return;
    }

    $noticeStmt = $pdo->prepare(
        'SELECT notice_id
         FROM pod_admin_notices
         WHERE notice_id = :notice_id
           AND pod_id = :pod_id
           AND target_user_id = :target_user_id
           AND notice_type = "member_left_split_policy"
           AND is_resolved = 0
         LIMIT 1'
    );
    $noticeStmt->execute([
        ':notice_id' => $noticeId,
        ':pod_id' => $podId,
        ':target_user_id' => $viewerId,
    ]);
    if ($noticeStmt->fetch() === false) {
        $pdo->rollBack();
        Http::json(['error' => 'Open split-policy notice not found'], 404);
        return;
    }

    if ($policy === 'equal') {
        $updatePodStmt = $pdo->prepare(
            'UPDATE pods
             SET default_split_method = "equal"
             WHERE pod_id = :pod_id'
        );
        $updatePodStmt->execute([':pod_id' => $podId]);
    }

    $resolveStmt = $pdo->prepare(
        'UPDATE pod_admin_notices
         SET is_resolved = 1, resolved_at = NOW()
         WHERE notice_id = :notice_id'
    );
    $resolveStmt->execute([':notice_id' => $noticeId]);

    $pdo->commit();
    Http::json([
        'ok' => true,
        'message' => 'Split policy confirmed for future expenses',
        'data' => [
            'podId' => $podId,
            'policy' => $policy,
        ],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Http::json(['error' => 'Unable to confirm split policy', 'detail' => $e->getMessage()], 503);
}
