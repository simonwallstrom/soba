CREATE TABLE `favorite` (
	`user_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`favorited_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `recipe_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `favorite_recipe_id_idx` ON `favorite` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `planned_meal` (
	`household_id` text NOT NULL,
	`date` text NOT NULL,
	`recipe_id` text NOT NULL,
	`suggestion_id` text,
	`planned_by` text NOT NULL,
	`planned_at` integer NOT NULL,
	PRIMARY KEY(`household_id`, `date`),
	FOREIGN KEY (`household_id`) REFERENCES `household`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `planned_meal_recipe_id_idx` ON `planned_meal` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `recipe_profile` (
	`recipe_id` text PRIMARY KEY NOT NULL,
	`is_dinner` integer NOT NULL,
	`base` text NOT NULL,
	`protein` text NOT NULL,
	`effort` text NOT NULL,
	`is_treat` integer NOT NULL,
	`version` integer NOT NULL,
	`source_hash` text NOT NULL,
	`profiled_at` integer NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recipe_tag` (
	`recipe_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`recipe_id`, `tag_id`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipe`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recipe_tag_tag_id_idx` ON `recipe_tag` (`tag_id`);--> statement-breakpoint
CREATE TABLE `recipe` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`servings` integer,
	`image_url` text,
	`source_url` text,
	`ingredients` text NOT NULL,
	`instructions` text NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `household`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recipe_household_id_idx` ON `recipe` (`household_id`);--> statement-breakpoint
CREATE TABLE `tag` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `household`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tag_household_id_idx` ON `tag` (`household_id`);