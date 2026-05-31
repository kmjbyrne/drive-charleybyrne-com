CREATE TABLE `file_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`space_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`mime_type` text,
	`ext` text,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`blob_key` text,
	`owner_id` text NOT NULL,
	`starred` integer DEFAULT false NOT NULL,
	`trashed_at` integer,
	`created_at` integer NOT NULL,
	`modified_at` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `file_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `file_members` (
	`file_id` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`file_id`) REFERENCES `file_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `file_tags` (
	`file_id` text NOT NULL,
	`tag_id` text NOT NULL,
	FOREIGN KEY (`file_id`) REFERENCES `file_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `object_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`object_id` text NOT NULL,
	`object_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`role` text NOT NULL,
	`granted_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `share_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`object_id` text NOT NULL,
	`object_type` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`granted_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT 'folder' NOT NULL,
	`color` text DEFAULT '#00C16A' NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`color` text NOT NULL,
	`owner_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`avatar` text,
	`tid` text NOT NULL,
	`last_seen_at` integer NOT NULL
);
