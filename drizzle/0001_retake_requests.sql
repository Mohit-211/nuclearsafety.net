CREATE TABLE `retake_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignment_id` int NOT NULL,
	`user_id` int NOT NULL,
	`course_id` int NOT NULL,
	`attempt_id` int NOT NULL,
	`status` enum('pending','approved','declined') NOT NULL DEFAULT 'pending',
	`reason` varchar(500),
	`requested_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`decided_by` int,
	`decided_at` datetime,
	`decision_note` varchar(500),
	`new_attempt_id` int,
	CONSTRAINT `retake_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `retake_requests` ADD CONSTRAINT `retake_requests_assignment_id_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retake_requests` ADD CONSTRAINT `retake_requests_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retake_requests` ADD CONSTRAINT `retake_requests_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retake_requests` ADD CONSTRAINT `retake_requests_attempt_id_attempts_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retake_requests` ADD CONSTRAINT `retake_requests_decided_by_users_id_fk` FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `retake_requests` ADD CONSTRAINT `retake_requests_new_attempt_id_attempts_id_fk` FOREIGN KEY (`new_attempt_id`) REFERENCES `attempts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `retake_requests_status_idx` ON `retake_requests` (`status`,`requested_at`);--> statement-breakpoint
CREATE INDEX `retake_requests_assignment_idx` ON `retake_requests` (`assignment_id`);