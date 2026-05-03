-- =============================================================================
-- Migrate existing `users.full_name` -> `first_name` + `last_name`
-- Run once against your imported database (phpMyAdmin SQL tab or mysql CLI).
-- Split rule: first whitespace-separated token = first_name, remainder = last_name.
-- =============================================================================

SET NAMES utf8mb4;

ALTER TABLE `users`
  ADD COLUMN `first_name` VARCHAR(64) NOT NULL DEFAULT '' AFTER `user_id`,
  ADD COLUMN `last_name` VARCHAR(64) NOT NULL DEFAULT '' AFTER `first_name`;

UPDATE `users`
SET
  `first_name` = TRIM(SUBSTRING_INDEX(TRIM(`full_name`), ' ', 1)),
  `last_name` = TRIM(
    CASE
      WHEN LOCATE(' ', TRIM(`full_name`)) > 0
      THEN SUBSTRING(TRIM(`full_name`), LOCATE(' ', TRIM(`full_name`)) + 1)
      ELSE ''
    END
  );

UPDATE `users`
SET `first_name` = 'Member'
WHERE TRIM(`first_name`) = '';

ALTER TABLE `users` DROP COLUMN `full_name`;
