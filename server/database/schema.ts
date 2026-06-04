import { sqliteTable, text, integer, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core'

export const spaces = sqliteTable('spaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('folder'),
  color: text('color').notNull().default('#00C16A'),
  ownerId: text('owner_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})

export const fileEntries = sqliteTable('file_entries', {
  id: text('id').primaryKey(),
  parentId: text('parent_id').references((): AnySQLiteColumn => fileEntries.id, {
    onDelete: 'cascade'
  }),
  spaceId: text('space_id').notNull(),
  name: text('name').notNull(),
  // 'folder' or 'file'
  type: text('type').notNull(),
  mimeType: text('mime_type'),
  ext: text('ext'),
  sizeBytes: integer('size_bytes').notNull().default(0),
  // Points to the blob key in the storage backend
  blobKey: text('blob_key'),
  ownerId: text('owner_id').notNull(),
  starred: integer('starred', { mode: 'boolean' }).notNull().default(false),
  trashedAt: integer('trashed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  modifiedAt: integer('modified_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  color: text('color').notNull(),
  ownerId: text('owner_id').notNull()
})

export const fileTags = sqliteTable('file_tags', {
  fileId: text('file_id')
    .notNull()
    .references(() => fileEntries.id, { onDelete: 'cascade' }),
  tagId: text('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' })
})

export const fileMembers = sqliteTable('file_members', {
  fileId: text('file_id')
    .notNull()
    .references(() => fileEntries.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull()
})

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  avatar: text('avatar'),
  tid: text('tid').notNull(),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})

export const shareInvites = sqliteTable('share_invites', {
  id: text('id').primaryKey(),
  // The file, folder, or space being shared
  objectId: text('object_id').notNull(),
  objectType: text('object_type').notNull(),
  // The email address of the invitee (may not be a registered user yet)
  email: text('email').notNull(),
  // 'viewer' | 'editor' | 'admin'
  role: text('role').notNull(),
  grantedBy: text('granted_by').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})

export const activities = sqliteTable('activities', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').notNull(),
  action: text('action').notNull(),
  objectId: text('object_id').notNull(),
  objectType: text('object_type').notNull(),
  objectName: text('object_name').notNull(),
  targetUserId: text('target_user_id'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})

export const objectPermissions = sqliteTable('object_permissions', {
  id: text('id').primaryKey(),
  // The file, folder, or space this permission applies to
  objectId: text('object_id').notNull(),
  // Discriminator: 'file' | 'folder' | 'space'
  objectType: text('object_type').notNull(),
  // Janus user GUID — cross-tenant sharing is supported
  subjectId: text('subject_id').notNull(),
  // 'viewer' | 'editor' | 'admin'
  role: text('role').notNull(),
  // Janus GUID of the user who created this grant
  grantedBy: text('granted_by').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})
