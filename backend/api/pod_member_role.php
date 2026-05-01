<?php

declare(strict_types=1);

// POST /api/pod-member-role — admin only.
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
$newRole = trim((string) ($input['newRole'] ?? ''));

if ($podId <= 0 || $targetUserId <= 0) {
    Http::json(['error' => 'podId and targetUserId are required'], 422);
    return;
}
if (!in_array($newRole, ['admin', 'member'], true)) {
    Http::json(['error' => 'newRole must be admin or member'], 422);
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
        Http::json(['error' => 'Only pod admins can change roles'], 403);
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

    $currentRole = (string) $target['member_role'];
    if ($currentRole === $newRole) {
        $pdo->commit();
        Http::json(['ok' => true, 'message' => 'Role unchanged']);
        return;
    }

    // Can't demote the last admin.
    if ($currentRole === 'admin' && $newRole === 'member') {
        $adminCountStmt = $pdo->prepare(
            'SELECT COUNT(*) AS admin_count
             FROM pod_members
             WHERE pod_id = :pod_id AND member_role = "admin"'
        );
        $adminCountStmt->execute([':pod_id' => $podId]);
        $adminCount = (int) (($adminCountStmt->fetch()['admin_count'] ?? 0));
        if ($adminCount <= 1) {
            $pdo->rollBack();
            Http::json(['error' => 'Cannot demote the last admin'], 422);
            return;
        }
    }

    $updateStmt = $pdo->prepare(
        'UPDATE pod_members
         SET member_role = :member_role
         WHERE pod_id = :pod_id AND user_id = :user_id'
    );
    $updateStmt->execute([
        ':member_role' => $newRole,
        ':pod_id' => $podId,
        ':user_id' => $targetUserId,
    ]);

    $pdo->commit();
    Http::json([
        'ok' => true,
        'message' => 'Member role updated',
        'data' => [
            'podId' => $podId,
            'targetUserId' => $targetUserId,
            'newRole' => $newRole,
        ],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Http::json(['error' => 'Unable to update role', 'detail' => $e->getMessage()], 503);
}
