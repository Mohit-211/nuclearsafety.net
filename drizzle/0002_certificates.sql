CREATE TABLE `certificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`number` varchar(32) NOT NULL,
	`user_id` int NOT NULL,
	`course_id` int NOT NULL,
	`attempt_id` int NOT NULL,
	`learner_name` varchar(160) NOT NULL,
	`course_title` varchar(255) NOT NULL,
	`completed_at` datetime NOT NULL,
	`issued_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificates_number_uq` UNIQUE(`number`),
	CONSTRAINT `certificates_attempt_uq` UNIQUE(`attempt_id`)
);
--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_attempt_id_attempts_id_fk` FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `certificates_user_course_idx` ON `certificates` (`user_id`,`course_id`);