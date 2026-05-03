-- Run once if your database was created before password reset support.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `token_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uq_password_reset_token_hash` (`token_hash`),
  KEY `idx_password_reset_user` (`user_id`),
  KEY `idx_password_reset_expires` (`expires_at`),
  CONSTRAINT `fk_password_reset_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
