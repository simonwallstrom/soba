CREATE TABLE `recipe_import` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`source_url` text,
	`source_photo_ids` text,
	`title` text,
	`photo_id` text,
	`recipe` text,
	`error` text,
	`run_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `household`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recipe_import_user_id_idx` ON `recipe_import` (`user_id`);