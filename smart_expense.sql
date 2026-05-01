-- =============================================================================
-- Smart Expense — full MySQL schema (canonical file: project root)
-- Server: MySQL 8+ / MariaDB 10.5+ recommended
-- Every table uses a descriptive primary key column (user_id, pod_id, …)
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `smart_expense`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `smart_expense`;

-- -----------------------------------------------------------------------------
-- Registered accounts (login identity)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(120) NOT NULL,
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
  `invite_code` VARCHAR(16) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'USD',
  `default_split_method` ENUM('equal', 'weighted') NOT NULL DEFAULT 'equal',
  `planned_member_count` SMALLINT UNSIGNED NULL,
  `created_by_user_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`pod_id`),
  UNIQUE KEY `uq_pods_invite_code` (`invite_code`),
  KEY `idx_pods_created_by` (`created_by_user_id`),
  CONSTRAINT `fk_pods_created_by_user`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
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

SET FOREIGN_KEY_CHECKS = 1;
