-- =============================================================================
-- Smart Expense — full MySQL schema (canonical file: project root)
-- Server: MySQL 8+ / MariaDB 10.5+ recommended
-- Every table uses a descriptive primary key column (user_id, pod_id, …)
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- Registered accounts (login identity)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `first_name` VARCHAR(64) NOT NULL,
  `last_name` VARCHAR(64) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(32) NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Pods (shared expense groups: apartment, trip, short stay, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pods` (
  `pod_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pod_name` VARCHAR(160) NOT NULL,
  `pod_type` ENUM('shared_residence', 'trip', 'short_stay', 'other') NOT NULL DEFAULT 'shared_residence',
  `pod_status` ENUM('active', 'archived') NOT NULL DEFAULT 'active',
  `invite_code` VARCHAR(16) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'USD',
  `default_split_method` ENUM('equal', 'weighted') NOT NULL DEFAULT 'equal',
  `planned_member_count` SMALLINT UNSIGNED NULL,
  `closed_reason` VARCHAR(500) NULL,
  `archived_at` TIMESTAMP NULL DEFAULT NULL,
  `archived_by_user_id` INT UNSIGNED NULL,
  `created_by_user_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`pod_id`),
  UNIQUE KEY `uq_pods_invite_code` (`invite_code`),
  KEY `idx_pods_created_by` (`created_by_user_id`),
  CONSTRAINT `fk_pods_created_by_user`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_pods_archived_by_user`
    FOREIGN KEY (`archived_by_user_id`) REFERENCES `users` (`user_id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Membership: which user belongs to which pod (and role)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pod_members` (
  `pod_member_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pod_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `member_role` ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  `joined_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`pod_member_id`),
  UNIQUE KEY `uq_pod_members_pod_user` (`pod_id`, `user_id`),
  KEY `idx_pod_members_user` (`user_id`),
  CONSTRAINT `fk_pod_members_pod`
    FOREIGN KEY (`pod_id`) REFERENCES `pods` (`pod_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pod_members_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Category lines configured per pod (dashboard + expense tagging)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pod_categories` (
  `pod_category_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pod_id` INT UNSIGNED NOT NULL,
  `category_label` VARCHAR(120) NOT NULL,
  `show_on_dashboard` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` SMALLINT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`pod_category_id`),
  KEY `idx_pod_categories_pod` (`pod_id`),
  CONSTRAINT `fk_pod_categories_pod`
    FOREIGN KEY (`pod_id`) REFERENCES `pods` (`pod_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Expenses logged inside a pod
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `expenses` (
  `expense_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pod_id` INT UNSIGNED NOT NULL,
  `pod_category_id` INT UNSIGNED NULL,
  `expense_title` VARCHAR(160) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `split_mode` ENUM('equal', 'weighted') NOT NULL DEFAULT 'equal',
  `paid_by_user_id` INT UNSIGNED NOT NULL,
  `expense_date` DATE NOT NULL,
  `notes` TEXT NULL,
  `created_by_user_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`expense_id`),
  KEY `idx_expenses_pod` (`pod_id`),
  KEY `idx_expenses_paid_by` (`paid_by_user_id`),
  KEY `idx_expenses_category` (`pod_category_id`),
  CONSTRAINT `fk_expenses_pod`
    FOREIGN KEY (`pod_id`) REFERENCES `pods` (`pod_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_expenses_pod_category`
    FOREIGN KEY (`pod_category_id`) REFERENCES `pod_categories` (`pod_category_id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_expenses_paid_by_user`
    FOREIGN KEY (`paid_by_user_id`) REFERENCES `users` (`user_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_expenses_created_by_user`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Who shares each expense + weight (for weighted splits)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `expense_participants` (
  `expense_participant_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `expense_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `weight` DECIMAL(10, 4) NOT NULL DEFAULT 1.0000,
  PRIMARY KEY (`expense_participant_id`),
  UNIQUE KEY `uq_expense_participants_expense_user` (`expense_id`, `user_id`),
  KEY `idx_expense_participants_user` (`user_id`),
  CONSTRAINT `fk_expense_participants_expense`
    FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`expense_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_expense_participants_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Settlement plans generated from current balances
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settlement_plans` (
  `settlement_plan_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pod_id` INT UNSIGNED NOT NULL,
  `created_by_user_id` INT UNSIGNED NULL,
  `status` ENUM('open', 'closed', 'cancelled') NOT NULL DEFAULT 'open',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`settlement_plan_id`),
  KEY `idx_settlement_plans_pod` (`pod_id`),
  KEY `idx_settlement_plans_status` (`status`),
  CONSTRAINT `fk_settlement_plans_pod`
    FOREIGN KEY (`pod_id`) REFERENCES `pods` (`pod_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_settlement_plans_created_by`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Individual transfers within a settlement plan
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settlement_transfers` (
  `transfer_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `settlement_plan_id` BIGINT UNSIGNED NOT NULL,
  `from_user_id` INT UNSIGNED NULL,
  `to_user_id` INT UNSIGNED NULL,
  `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`transfer_id`),
  KEY `idx_settlement_transfers_plan` (`settlement_plan_id`),
  KEY `idx_settlement_transfers_status` (`status`),
  CONSTRAINT `fk_settlement_transfers_plan`
    FOREIGN KEY (`settlement_plan_id`) REFERENCES `settlement_plans` (`settlement_plan_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_settlement_transfers_from_user`
    FOREIGN KEY (`from_user_id`) REFERENCES `users` (`user_id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_settlement_transfers_to_user`
    FOREIGN KEY (`to_user_id`) REFERENCES `users` (`user_id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Recorded settlement payments (used by dashboard payment history)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_records` (
  `payment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `transfer_id` BIGINT UNSIGNED NOT NULL,
  `payer_user_id` INT UNSIGNED NOT NULL,
  `receiver_user_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `paid_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `note` VARCHAR(255) NULL,
  PRIMARY KEY (`payment_id`),
  KEY `idx_payment_records_transfer` (`transfer_id`),
  KEY `idx_payment_records_payer` (`payer_user_id`),
  KEY `idx_payment_records_receiver` (`receiver_user_id`),
  KEY `idx_payment_records_paid_at` (`paid_at`),
  CONSTRAINT `fk_payment_records_transfer`
    FOREIGN KEY (`transfer_id`) REFERENCES `settlement_transfers` (`transfer_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_payment_records_payer`
    FOREIGN KEY (`payer_user_id`) REFERENCES `users` (`user_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_payment_records_receiver`
    FOREIGN KEY (`receiver_user_id`) REFERENCES `users` (`user_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Admin notices (e.g., member-left split-policy confirmation)
-- -----------------------------------------------------------------------------
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
