CREATE TABLE `assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`course_id` int NOT NULL,
	`organization_id` int,
	`assigned_by` int,
	`due_date` date,
	`assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`removed_at` datetime,
	`removed_by` int,
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `assignments_user_course_uq` UNIQUE(`user_id`,`course_id`)
);
--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignment_id` int NOT NULL,
	`user_id` int NOT NULL,
	`course_id` int NOT NULL,
	`version_id` int NOT NULL,
	`attempt_number` int NOT NULL,
	`completion_status` varchar(20) NOT NULL DEFAULT 'not attempted',
	`success_status` varchar(20) NOT NULL DEFAULT 'unknown',
	`score_raw` double,
	`score_min` double,
	`score_max` double,
	`score_scaled` double,
	`progress_measure` double,
	`location` varchar(1000),
	`total_time_seconds` int NOT NULL DEFAULT 0,
	`total_time_raw` varchar(40),
	`last_exit` varchar(20),
	`cmi` longtext,
	`commit_count` int NOT NULL DEFAULT 0,
	`started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`last_commit_at` datetime,
	`completed_at` datetime,
	`terminated_at` datetime,
	CONSTRAINT `attempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `attempts_assignment_num_uq` UNIQUE(`assignment_id`,`attempt_number`)
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`actor_id` int,
	`action` varchar(80) NOT NULL,
	`entity_type` varchar(40) NOT NULL,
	`entity_id` int,
	`subject_user_id` int,
	`course_id` int,
	`organization_id` int,
	`metadata` json,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `course_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`course_id` int NOT NULL,
	`version_number` int NOT NULL,
	`scorm_version` enum('1.2','2004') NOT NULL,
	`schema_version` varchar(60),
	`manifest_identifier` varchar(255),
	`manifest_title` varchar(255),
	`launch_path` varchar(1024) NOT NULL,
	`sco_count` int NOT NULL,
	`manifest` json NOT NULL,
	`storage_key` varchar(64) NOT NULL,
	`original_filename` varchar(255),
	`zip_size_bytes` bigint NOT NULL,
	`file_count` int NOT NULL,
	`uncompressed_bytes` bigint NOT NULL,
	`warnings` json,
	`status` enum('ready','archived') NOT NULL DEFAULT 'ready',
	`uploaded_by` int,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`activated_at` datetime,
	`activated_by` int,
	CONSTRAINT `course_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `course_versions_course_num_uq` UNIQUE(`course_id`,`version_number`),
	CONSTRAINT `course_versions_storage_uq` UNIQUE(`storage_key`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(120),
	`estimated_duration` varchar(40),
	`is_mandatory` boolean NOT NULL DEFAULT false,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`active_version_id` int,
	`created_by` int,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `courses_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `organization_courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`course_id` int NOT NULL,
	`granted_by` int,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `organization_courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_courses_uq` UNIQUE(`organization_id`,`course_id`)
);
--> statement-breakpoint
CREATE TABLE `organization_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`user_id` int NOT NULL,
	`role` enum('member','admin') NOT NULL DEFAULT 'member',
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `organization_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_members_user_uq` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`created_by` int,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_name_uq` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `password_tokens` (
	`id` char(64) NOT NULL,
	`user_id` int NOT NULL,
	`purpose` enum('reset','invite') NOT NULL,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `password_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`key` varchar(80) NOT NULL,
	`value` json NOT NULL,
	`updated_by` int,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `platform_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` char(64) NOT NULL,
	`user_id` int NOT NULL,
	`expires_at` datetime NOT NULL,
	`user_agent` varchar(255),
	`ip` varchar(64),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(160) NOT NULL,
	`password_hash` varchar(255),
	`role` enum('platform_admin','learner') NOT NULL DEFAULT 'learner',
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`job_title` varchar(160),
	`department` varchar(160),
	`password_changed_at` datetime,
	`last_login_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_assigned_by_users_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_removed_by_users_id_fk` FOREIGN KEY (`removed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attempts` ADD CONSTRAINT `attempts_assignment_id_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attempts` ADD CONSTRAINT `attempts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attempts` ADD CONSTRAINT `attempts_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attempts` ADD CONSTRAINT `attempts_version_id_course_versions_id_fk` FOREIGN KEY (`version_id`) REFERENCES `course_versions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_events` ADD CONSTRAINT `audit_events_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_events` ADD CONSTRAINT `audit_events_subject_user_id_users_id_fk` FOREIGN KEY (`subject_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_events` ADD CONSTRAINT `audit_events_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_events` ADD CONSTRAINT `audit_events_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_versions` ADD CONSTRAINT `course_versions_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_versions` ADD CONSTRAINT `course_versions_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_versions` ADD CONSTRAINT `course_versions_activated_by_users_id_fk` FOREIGN KEY (`activated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `courses` ADD CONSTRAINT `courses_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_courses` ADD CONSTRAINT `organization_courses_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_courses` ADD CONSTRAINT `organization_courses_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_courses` ADD CONSTRAINT `organization_courses_granted_by_users_id_fk` FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organizations` ADD CONSTRAINT `organizations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_tokens` ADD CONSTRAINT `password_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD CONSTRAINT `platform_settings_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `assignments_course_idx` ON `assignments` (`course_id`);--> statement-breakpoint
CREATE INDEX `assignments_org_idx` ON `assignments` (`organization_id`);--> statement-breakpoint
CREATE INDEX `attempts_user_course_idx` ON `attempts` (`user_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `attempts_version_idx` ON `attempts` (`version_id`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_subject_idx` ON `audit_events` (`subject_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_org_idx` ON `audit_events` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `courses_status_idx` ON `courses` (`status`);--> statement-breakpoint
CREATE INDEX `org_courses_course_idx` ON `organization_courses` (`course_id`);--> statement-breakpoint
CREATE INDEX `org_members_org_idx` ON `organization_members` (`organization_id`);--> statement-breakpoint
CREATE INDEX `password_tokens_user_idx` ON `password_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);