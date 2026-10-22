ALTER TABLE `recipe` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `recipe` ADD `deleted_by` text;--> statement-breakpoint
CREATE INDEX `recipe_deleted_at_idx` ON `recipe` (`deleted_at`);