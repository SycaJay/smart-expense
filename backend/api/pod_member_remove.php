<?php

declare(strict_types=1);

// POST /api/pod-member-remove — admin only.
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
$targetUserId = (int) ($input['targetUserId'] ?? 0);

if ($podId <= 0 || $targetUserId <= 0) {
    Http::json(['error' => 'podId and targetUserId are required'], 422);
    return;
}
if ($targetUserId === $viewerId) {
    Http::json(['error' => 'Use leave pod action for yourself'], 422);
    return;
}

try {
    $pdo = Database::pdo();
    $pdo->beginTransaction();

    $viewerStmt = $pdo->prepare(
        'SELECT pm.member_role, p.pod_status
         FROM pod_members pm
         INNER JOIN pods p ON p.pod_id = pm.pod_id
         WHERE pm.pod_id = :pod_id AND pm.user_id = :user_id
         LIMIT 1'
    );
    $viewerStmt->execute([':pod_id' => $podId, ':user_id' => $viewerId]);
    $viewer = $viewerStmt->fetch();
    if (!is_array($viewer) || (string) $viewer['member_role'] !== 'admin') {
        $pdo->rollBack();
        Http::json(['error' => 'Only pod admins can remove members'], 403);
        return;
    }
    if ((string) $viewer['pod_status'] === 'archived') {
        $pdo->rollBack();
        Http::json(['error' => 'Archived pods cannot be edited'], 422);
        return;
    }

    $targetStmt = $pdo->prepare(
        'SELECT member_role
         FROM pod_members
         WHERE pod_id = :pod_id AND user_id = :user_id
         LIMIT 1'
    );
    $targetStmt->execute([':pod_id' => $podId, ':user_id' => $targetUserId]);
    $target = $targetStmt->fetch();
    if (!is_array($target)) {
        $pdo->rollBack();
        Http::json(['error' => 'Target member not found in this pod'], 404);
        return;
    }

    $memberCountStmt = $pdo->prepare(
        'SELECT COUNT(*) AS member_count FROM pod_members WHERE pod_id = :pod_id'
    );
    $memberCountStmt->execute([':pod_id' => $podId]);
    $memberCount = (int) (($memberCountStmt->fetch()['member_count'] ?? 0));
    if ($memberCount <= 1) {
        $pdo->rollBack();
        Http::json(['error' => 'Cannot remove the only member in this pod'], 422);
        return;
    }

    if ((string) $target['member_role'] === 'admin') {
        $adminCountStmt = $pdo->prepare(
            'SELECT COUNT(*) AS admin_count
             FROM pod_members
             WHERE pod_id = :pod_id AND member_role = "admin"'
        );
        $adminCountStmt->execute([':pod_id' => $podId]);
        $adminCount = (int) (($adminCountStmt->fetch()['admin_count'] ?? 0));
        if ($adminCount <= 1) {
            $pdo->rollBack();
            Http::json(['error' => 'Cannot remove the last admin'], 422);
            return;
        }
    }

    $deleteStmt = $pdo->prepare(
        'DELETE FROM pod_members
         WHERE pod_id = :pod_id AND user_id = :user_id'
    );
    $deleteStmt->execute([':pod_id' => $podId, ':user_id' => $targetUserId]);

    $pdo->commit();
    Http::json([
        'ok' => true,
        'message' => 'Member removed from pod',
        'data' => [
            'podId' => $podId,
            'targetUserId' => $targetUserId,
        ],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Http::json(['error' => 'Unable to remove member', 'detail' => $e->getMessage()], 503);
}
