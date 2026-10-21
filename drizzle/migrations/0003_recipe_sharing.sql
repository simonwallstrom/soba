ALTER TABLE `household_invite` ADD `enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `recipe` ADD `share_token` text;--> statement-breakpoint
ALTER TABLE `recipe` ADD `is_shared` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `recipe` ADD `copied_from` text;--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_share_token_unique` ON `recipe` (`share_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_household_copied_from_unique` ON `recipe` (`household_id`,`copied_from`);