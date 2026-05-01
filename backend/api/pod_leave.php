<?php

declare(strict_types=1);

// POST /api/pod-leave — leave (+ emails / notices).
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
$reason = trim((string) ($input['reason'] ?? ''));
$confirmStepOne = (bool) ($input['confirmStepOne'] ?? false);
$confirmStepTwo = (bool) ($input['confirmStepTwo'] ?? false);
if ($podId <= 0) {
    Http::json(['error' => 'podId is required'], 422);
    return;
}
if (!$confirmStepOne || !$confirmStepTwo) {
    Http::json(['error' => 'Please complete both leave confirmations'], 422);
    return;
}
if (mb_strlen($reason) > 500) {
    Http::json(['error' => 'Reason must be 500 characters or fewer'], 422);
    return;
}

try {
    $pdo = Database::pdo();
    $pdo->beginTransaction();

    $createNoticesTable = <<<SQL
CREATE TABLE IF NOT EXISTS `pod_admin_notices` (
  `notice_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pod_id` INT UNSIGNED NOT NULL,
  `target_user_id` INT UNSIGNED NOT NULL,
  `notice_type` VARCHAR(64) NOT NULL,
  `payload_json` JSON NULL,
  `is_resolved` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`notice_id`),
  KEY `idx_pod_admin_notices_pod` (`pod_id`),
  KEY `idx_pod_admin_notices_target` (`target_user_id`),
  KEY `idx_pod_admin_notices_open` (`is_resolved`),
  CONSTRAINT `fk_pod_admin_notices_pod`
    FOREIGN KEY (`pod_id`) REFERENCES `pods` (`pod_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pod_admin_notices_target_user`
    FOREIGN KEY (`target_user_id`) REFERENCES `users` (`user_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;
    $pdo->exec($createNoticesTable);

    $selfStmt = $pdo->prepare(
        'SELECT pm.member_role, u.full_name, u.email
         FROM pod_members pm
         INNER JOIN users u ON u.user_id = pm.user_id
         WHERE pm.pod_id = :pod_id AND pm.user_id = :user_id
         LIMIT 1'
    );
    $selfStmt->execute([':pod_id' => $podId, ':user_id' => $viewerId]);
    $self = $selfStmt->fetch();
    if (!is_array($self)) {
        $pdo->rollBack();
        Http::json(['error' => 'You are not a member of this pod'], 403);
        return;
    }

    $leaveUserName = (string) ($self['full_name'] ?? 'A member');
    $leaveUserEmail = strtolower(trim((string) ($self['email'] ?? '')));

    $podStmt = $pdo->prepare(
        'SELECT pod_name, created_by_user_id, default_split_method, currency
         FROM pods
         WHERE pod_id = :pod_id
         LIMIT 1'
    );
    $podStmt->execute([':pod_id' => $podId]);
    $pod = $podStmt->fetch();
    if (!is_array($pod)) {
        $pdo->rollBack();
        Http::json(['error' => 'Pod not found'], 404);
        return;
    }

    $memberCountStmt = $pdo->prepare(
        'SELECT COUNT(*) AS member_count FROM pod_members WHERE pod_id = :pod_id'
    );
    $memberCountStmt->execute([':pod_id' => $podId]);
    $memberCount = (int) (($memberCountStmt->fetch()['member_count'] ?? 0));

    $isAdmin = (string) $self['member_role'] === 'admin';
    if ($isAdmin) {
        $adminCountStmt = $pdo->prepare(
            'SELECT COUNT(*) AS admin_count
             FROM pod_members
             WHERE pod_id = :pod_id AND member_role = "admin"'
        );
        $adminCountStmt->execute([':pod_id' => $podId]);
        $adminCount = (int) (($adminCountStmt->fetch()['admin_count'] ?? 0));
        if ($adminCount <= 1 && $memberCount > 1) {
            $pdo->rollBack();
            Http::json(['error' => 'Promote another admin before leaving this pod'], 422);
            return;
        }
    }

    $deleteMembershipStmt = $pdo->prepare(
        'DELETE FROM pod_members
         WHERE pod_id = :pod_id AND user_id = :user_id'
    );
    $deleteMembershipStmt->execute([':pod_id' => $podId, ':user_id' => $viewerId]);

    $podDeleted = false;
    $adminNoticeId = null;
    $remainingMembers = [];
    if ($memberCount <= 1) {
        $deletePodStmt = $pdo->prepare('DELETE FROM pods WHERE pod_id = :pod_id');
        $deletePodStmt->execute([':pod_id' => $podId]);
        $podDeleted = true;
    } else {
        $remainingMembersStmt = $pdo->prepare(
            'SELECT u.user_id, u.full_name, u.email
             FROM pod_members pm
             INNER JOIN users u ON u.user_id = pm.user_id
             WHERE pm.pod_id = :pod_id'
        );
        $remainingMembersStmt->execute([':pod_id' => $podId]);
        $remainingMembers = $remainingMembersStmt->fetchAll();

        $targetForNotice = (int) $pod['created_by_user_id'];
        $remainingAdminId = null;
        $remainingAnyId = null;
        foreach ($remainingMembers as $remainingMember) {
            $remainingId = (int) ($remainingMember['user_id'] ?? 0);
            if ($remainingAnyId === null && $remainingId > 0) {
                $remainingAnyId = $remainingId;
            }
            if ($remainingId === $targetForNotice) {
                $remainingAdminId = $targetForNotice;
                break;
            }
        }
        if ($remainingAdminId === null) {
            $remainingRoleStmt = $pdo->prepare(
                'SELECT user_id
                 FROM pod_members
                 WHERE pod_id = :pod_id AND member_role = "admin"
                 ORDER BY pod_member_id ASC
                 LIMIT 1'
            );
            $remainingRoleStmt->execute([':pod_id' => $podId]);
            $adminRow = $remainingRoleStmt->fetch();
            if (is_array($adminRow)) {
                $remainingAdminId = (int) $adminRow['user_id'];
            }
        }
        if ($remainingAdminId !== null) {
            $targetForNotice = $remainingAdminId;
        } elseif ($remainingAnyId !== null) {
            $targetForNotice = $remainingAnyId;
        }

        $noticePayload = json_encode([
            'kind' => 'member_left_split_policy',
            'leftUserName' => $leaveUserName,
            'leftUserId' => $viewerId,
            'reason' => $reason,
            'previousDefaultSplitMethod' => (string) $pod['default_split_method'],
            'remainingMemberCount' => max(0, $memberCount - 1),
        ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        $noticeInsert = $pdo->prepare(
            'INSERT INTO pod_admin_notices (pod_id, target_user_id, notice_type, payload_json, is_resolved)
             VALUES (:pod_id, :target_user_id, "member_left_split_policy", :payload_json, 0)'
        );
        $noticeInsert->execute([
            ':pod_id' => $podId,
            ':target_user_id' => $targetForNotice,
            ':payload_json' => $noticePayload,
        ]);
        $adminNoticeId = (int) $pdo->lastInsertId();
    }

    $pdo->commit();

    if (!$podDeleted) {
        $podName = (string) $pod['pod_name'];
        $currency = strtoupper((string) $pod['currency']);
        $reasonHtml = $reason !== '' ? nl2br(htmlspecialchars($reason, ENT_QUOTES, 'UTF-8')) : 'No reason provided.';
        $subject = $leaveUserName . ' has left ' . $podName;
        foreach ($remainingMembers as $member) {
            $recipientEmail = strtolower(trim((string) ($member['email'] ?? '')));
            $recipientName = (string) ($member['full_name'] ?? 'Member');
            if (!filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
                continue;
            }
            $body = '
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
                  <h2 style="margin:0 0 12px;">Pod membership update</h2>
                  <p><strong>' . htmlspecialchars($leaveUserName, ENT_QUOTES, 'UTF-8') . '</strong> has left <strong>' . htmlspecialchars($podName, ENT_QUOTES, 'UTF-8') . '</strong>.</p>
                  <p><strong>Reason:</strong><br>' . $reasonHtml . '</p>
                  <p>Future expenses are now split among remaining members only.</p>
                  <p>Current pod currency: <strong>' . htmlspecialchars($currency, ENT_QUOTES, 'UTF-8') . '</strong></p>
                  <p style="margin-top:20px;">- Smart Expense Team</p>
                </div>
            ';
            $plain = "{$leaveUserName} has left {$podName}.\n"
                . "Reason: " . ($reason !== '' ? $reason : 'No reason provided.') . "\n"
                . "Future expenses will split among remaining members only.\n"
                . "Smart Expense Team";
            Mailer::send($recipientEmail, $recipientName, $subject, $body, $plain);
        }
    }

    Http::json([
        'ok' => true,
        'message' => $podDeleted ? 'You left and the empty pod was deleted' : 'You left the pod',
        'data' => [
            'podId' => $podId,
            'podDeleted' => $podDeleted,
            'leftUserName' => $leaveUserName,
            'reason' => $reason,
            'adminNoticeId' => $adminNoticeId,
        ],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    Http::json(['error' => 'Unable to leave pod', 'detail' => $e->getMessage()], 503);
}
