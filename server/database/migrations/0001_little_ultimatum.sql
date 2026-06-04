CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`object_id` text NOT NULL,
	`object_type` text NOT NULL,
	`object_name` text NOT NULL,
	`target_user_id` text,
	`created_at` integer NOT NULL
);
