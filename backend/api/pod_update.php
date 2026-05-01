<?php

declare(strict_types=1);

// POST /api/pod-update — admin: name + default split.
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
$podName = trim((string) ($input['podName'] ?? ''));
$defaultSplitMethod = trim((string) ($input['defaultSplitMethod'] ?? ''));

if ($podId <= 0) {
    Http::json(['error' => 'podId is required'], 422);
    return;
}

if ($podName === '' || mb_strlen($podName) > 160) {
    Http::json(['error' => 'podName is required and must be <= 160 chars'], 422);
    return;
}

if (!in_array($defaultSplitMethod, ['equal', 'weighted'], true)) {
    Http::json(['error' => 'defaultSplitMethod must be equal or weighted'], 422);
    return;
}

try {
    $pdo = Database::pdo();

    $accessStmt = $pdo->prepare(
        'SELECT pm.member_role, p.pod_status
         FROM pod_members pm
         INNER JOIN pods p ON p.pod_id = pm.pod_id
         WHERE pm.pod_id = :pod_id AND pm.user_id = :user_id
         LIMIT 1'
    );
    $accessStmt->execute([':pod_id' => $podId, ':user_id' => $viewerId]);
    $access = $accessStmt->fetch();
    if (!is_array($access)) {
        Http::json(['error' => 'You are not a member of this pod'], 403);
        return;
    }
    if ((string) $access['member_role'] !== 'admin') {
        Http::json(['error' => 'Only pod admins can update pod settings'], 403);
        return;
    }
    if ((string) $access['pod_status'] === 'archived') {
        Http::json(['error' => 'Archived pods cannot be edited'], 422);
        return;
    }

    $updateStmt = $pdo->prepare(
        'UPDATE pods
         SET pod_name = :pod_name, default_split_method = :default_split_method
         WHERE pod_id = :pod_id'
    );
    $updateStmt->execute([
        ':pod_name' => $podName,
        ':default_split_method' => $defaultSplitMethod,
        ':pod_id' => $podId,
    ]);

    Http::json([
        'ok' => true,
        'message' => 'Pod settings updated',
        'data' => [
            'podId' => $podId,
            'podName' => $podName,
            'defaultSplitMethod' => $defaultSplitMethod,
        ],
    ]);
} catch (Throwable $e) {
    Http::json(['error' => 'Unable to update pod settings', 'detail' => $e->getMessage()], 503);
}
