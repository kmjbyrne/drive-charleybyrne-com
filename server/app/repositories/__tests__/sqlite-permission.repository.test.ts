import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '../../../database/schema'
import { SqlitePermissionRepository } from '../sqlite-permission.repository'
import type { ObjectPermission } from '../../../core/domain/permission'

function createTestDb() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: './server/database/migrations' })
  return db
}

function makePermission(overrides: Partial<ObjectPermission> = {}): ObjectPermission {
  return {
    id: 'perm-1',
    objectId: 'object-1',
    objectType: 'file',
    subjectId: 'user-1',
    role: 'viewer',
    grantedBy: 'owner-1',
    createdAt: new Date(),
    ...overrides
  }
}

describe('SqlitePermissionRepository', () => {
  let repo: SqlitePermissionRepository

  beforeEach(() => {
    const db = createTestDb()
    repo = new SqlitePermissionRepository(db)
  })

  describe('grant', () => {
    it('creates a permission that can be retrieved', async () => {
      const permission = makePermission()
      await repo.grant(permission)

      const found = await repo.getPermission('object-1', 'user-1')
      expect(found).not.toBeNull()
      expect(found!.id).toBe('perm-1')
      expect(found!.objectType).toBe('file')
      expect(found!.role).toBe('viewer')
      expect(found!.grantedBy).toBe('owner-1')
    })

    it('upserts when the same objectId and subjectId already exists', async () => {
      await repo.grant(makePermission({ role: 'viewer' }))
      await repo.grant(makePermission({ id: 'perm-2', role: 'editor', grantedBy: 'admin-1' }))

      const all = await repo.listByObject('object-1')
      expect(all).toHaveLength(1)
      expect(all[0]!.role).toBe('editor')
      expect(all[0]!.grantedBy).toBe('admin-1')
    })
  })

  describe('revoke', () => {
    it('removes an existing grant', async () => {
      await repo.grant(makePermission())
      await repo.revoke('object-1', 'user-1')

      const found = await repo.getPermission('object-1', 'user-1')
      expect(found).toBeNull()
    })

    it('does not error when revoking a non-existent grant', async () => {
      await expect(repo.revoke('object-99', 'user-99')).resolves.toBeUndefined()
    })
  })

  describe('getPermission', () => {
    it('returns null when no grant exists', async () => {
      const found = await repo.getPermission('object-99', 'user-99')
      expect(found).toBeNull()
    })
  })

  describe('listByObject', () => {
    it('returns all grants for a given object', async () => {
      await repo.grant(makePermission({ id: 'p1', subjectId: 'user-1' }))
      await repo.grant(makePermission({ id: 'p2', subjectId: 'user-2' }))
      await repo.grant(makePermission({ id: 'p3', subjectId: 'user-3' }))
      // Different object — should not appear
      await repo.grant(makePermission({ id: 'p4', objectId: 'object-2', subjectId: 'user-4' }))

      const results = await repo.listByObject('object-1')
      expect(results).toHaveLength(3)
      expect(results.map(r => r.subjectId)).toContain('user-1')
      expect(results.map(r => r.subjectId)).toContain('user-2')
      expect(results.map(r => r.subjectId)).toContain('user-3')
    })
  })

  describe('listBySubject', () => {
    it('returns all grants for a user across different objects', async () => {
      await repo.grant(makePermission({ id: 'p1', objectId: 'file-1', subjectId: 'user-1' }))
      await repo.grant(makePermission({ id: 'p2', objectId: 'folder-1', objectType: 'folder', subjectId: 'user-1' }))
      await repo.grant(makePermission({ id: 'p3', objectId: 'space-1', objectType: 'space', subjectId: 'user-1' }))
      // Different user — should not appear
      await repo.grant(makePermission({ id: 'p4', objectId: 'file-2', subjectId: 'user-2' }))

      const results = await repo.listBySubject('user-1')
      expect(results).toHaveLength(3)
      expect(results.map(r => r.objectId)).toContain('file-1')
      expect(results.map(r => r.objectId)).toContain('folder-1')
      expect(results.map(r => r.objectId)).toContain('space-1')
    })
  })

  describe('listBySubjectAndType', () => {
    it('filters grants by subject and object type', async () => {
      await repo.grant(makePermission({ id: 'p1', objectId: 'file-1', objectType: 'file', subjectId: 'user-1' }))
      await repo.grant(makePermission({ id: 'p2', objectId: 'file-2', objectType: 'file', subjectId: 'user-1' }))
      await repo.grant(makePermission({ id: 'p3', objectId: 'space-1', objectType: 'space', subjectId: 'user-1' }))
      await repo.grant(makePermission({ id: 'p4', objectId: 'folder-1', objectType: 'folder', subjectId: 'user-1' }))

      const fileGrants = await repo.listBySubjectAndType('user-1', 'file')
      expect(fileGrants).toHaveLength(2)
      expect(fileGrants.every(r => r.objectType === 'file')).toBe(true)

      const spaceGrants = await repo.listBySubjectAndType('user-1', 'space')
      expect(spaceGrants).toHaveLength(1)
      expect(spaceGrants[0]!.objectId).toBe('space-1')
    })

    it('returns empty array when subject has no grants of that type', async () => {
      await repo.grant(makePermission({ id: 'p1', objectType: 'file', subjectId: 'user-1' }))

      const results = await repo.listBySubjectAndType('user-1', 'space')
      expect(results).toHaveLength(0)
    })
  })
})
