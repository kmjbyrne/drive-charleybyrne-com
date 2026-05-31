import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '../../../database/schema'
import { SqliteCatalogRepository } from '../../../app/repositories/sqlite-catalog.repository'
import { SqlitePermissionRepository } from '../../../app/repositories/sqlite-permission.repository'
import { PermissionService } from '../permission.service'
import type { FileEntry, Space } from '../../domain/catalog'

function createTestDb() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: './server/database/migrations' })
  return db
}

function makeSpace(overrides: Partial<Space> = {}): Space {
  return {
    id: 'space-1',
    name: 'Personal',
    icon: 'folder',
    color: '#00C16A',
    ownerId: 'owner-1',
    createdAt: new Date(),
    ...overrides
  }
}

function makeEntry(overrides: Partial<FileEntry> = {}): FileEntry {
  return {
    id: 'entry-1',
    parentId: null,
    spaceId: 'space-1',
    name: 'test-file',
    type: 'file',
    mimeType: 'text/plain',
    ext: '.txt',
    sizeBytes: 1024,
    blobKey: 'owner-1/space-1/entry-1.txt',
    ownerId: 'owner-1',
    starred: false,
    trashedAt: null,
    createdAt: new Date(),
    modifiedAt: new Date(),
    ...overrides
  }
}

describe('PermissionService', () => {
  let service: PermissionService
  let catalogRepo: SqliteCatalogRepository

  beforeEach(async () => {
    const db = createTestDb()
    catalogRepo = new SqliteCatalogRepository(db)
    const permissionRepo = new SqlitePermissionRepository(db)
    service = new PermissionService(permissionRepo, catalogRepo)

    // Build a hierarchy: space -> folder-1 -> folder-2 -> file-1
    await catalogRepo.createSpace(makeSpace())

    await catalogRepo.createEntry(makeEntry({
      id: 'folder-1',
      name: 'Documents',
      type: 'folder',
      parentId: null,
      blobKey: null
    }))

    await catalogRepo.createEntry(makeEntry({
      id: 'folder-2',
      name: 'Work',
      type: 'folder',
      parentId: 'folder-1',
      blobKey: null
    }))

    await catalogRepo.createEntry(makeEntry({
      id: 'file-1',
      name: 'report',
      type: 'file',
      parentId: 'folder-2'
    }))
  })

  describe('resolve', () => {
    it('returns a direct grant on the file', async () => {
      await service.grant({
        objectId: 'file-1',
        objectType: 'file',
        subjectId: 'user-ext',
        role: 'editor',
        grantedBy: 'owner-1'
      })

      const effective = await service.resolve('file-1', 'file', 'user-ext')
      expect(effective).not.toBeNull()
      expect(effective!.role).toBe('editor')
      expect(effective!.sourceObjectId).toBe('file-1')
      expect(effective!.sourceObjectType).toBe('file')
    })

    it('returns null when no grant exists anywhere', async () => {
      const effective = await service.resolve('file-1', 'file', 'user-stranger')
      expect(effective).toBeNull()
    })

    it('inherits a grant from the parent folder', async () => {
      await service.grant({
        objectId: 'folder-2',
        objectType: 'folder',
        subjectId: 'user-ext',
        role: 'viewer',
        grantedBy: 'owner-1'
      })

      const effective = await service.resolve('file-1', 'file', 'user-ext')
      expect(effective).not.toBeNull()
      expect(effective!.role).toBe('viewer')
      expect(effective!.sourceObjectId).toBe('folder-2')
      expect(effective!.sourceObjectType).toBe('folder')
    })

    it('inherits a grant from a grandparent folder', async () => {
      await service.grant({
        objectId: 'folder-1',
        objectType: 'folder',
        subjectId: 'user-ext',
        role: 'admin',
        grantedBy: 'owner-1'
      })

      const effective = await service.resolve('file-1', 'file', 'user-ext')
      expect(effective).not.toBeNull()
      expect(effective!.role).toBe('admin')
      expect(effective!.sourceObjectId).toBe('folder-1')
    })

    it('inherits a grant from the space', async () => {
      await service.grant({
        objectId: 'space-1',
        objectType: 'space',
        subjectId: 'user-ext',
        role: 'viewer',
        grantedBy: 'owner-1'
      })

      const effective = await service.resolve('file-1', 'file', 'user-ext')
      expect(effective).not.toBeNull()
      expect(effective!.role).toBe('viewer')
      expect(effective!.sourceObjectId).toBe('space-1')
      expect(effective!.sourceObjectType).toBe('space')
    })

    it('direct grant takes precedence over parent grants', async () => {
      // Grant admin on space
      await service.grant({
        objectId: 'space-1',
        objectType: 'space',
        subjectId: 'user-ext',
        role: 'admin',
        grantedBy: 'owner-1'
      })

      // Grant viewer directly on file (more restrictive)
      await service.grant({
        objectId: 'file-1',
        objectType: 'file',
        subjectId: 'user-ext',
        role: 'viewer',
        grantedBy: 'owner-1'
      })

      const effective = await service.resolve('file-1', 'file', 'user-ext')
      expect(effective).not.toBeNull()
      // Direct grant wins — first match in the walk
      expect(effective!.role).toBe('viewer')
      expect(effective!.sourceObjectId).toBe('file-1')
    })

    it('returns null for a space with no grant', async () => {
      const effective = await service.resolve('space-1', 'space', 'user-ext')
      expect(effective).toBeNull()
    })
  })

  describe('canAccess', () => {
    it('owner always has access regardless of required role', async () => {
      const result = await service.canAccess('file-1', 'file', 'owner-1', 'admin', 'owner-1')
      expect(result).toBe(true)
    })

    it('viewer can access when viewer role is required', async () => {
      await service.grant({
        objectId: 'file-1',
        objectType: 'file',
        subjectId: 'user-ext',
        role: 'viewer',
        grantedBy: 'owner-1'
      })

      const result = await service.canAccess('file-1', 'file', 'user-ext', 'viewer')
      expect(result).toBe(true)
    })

    it('viewer cannot access when editor role is required', async () => {
      await service.grant({
        objectId: 'file-1',
        objectType: 'file',
        subjectId: 'user-ext',
        role: 'viewer',
        grantedBy: 'owner-1'
      })

      const result = await service.canAccess('file-1', 'file', 'user-ext', 'editor')
      expect(result).toBe(false)
    })

    it('editor can access when viewer role is required', async () => {
      await service.grant({
        objectId: 'file-1',
        objectType: 'file',
        subjectId: 'user-ext',
        role: 'editor',
        grantedBy: 'owner-1'
      })

      const result = await service.canAccess('file-1', 'file', 'user-ext', 'viewer')
      expect(result).toBe(true)
    })

    it('returns false when no grant exists', async () => {
      const result = await service.canAccess('file-1', 'file', 'user-stranger', 'viewer')
      expect(result).toBe(false)
    })

    it('inherited grant satisfies access check', async () => {
      await service.grant({
        objectId: 'space-1',
        objectType: 'space',
        subjectId: 'user-ext',
        role: 'editor',
        grantedBy: 'owner-1'
      })

      const result = await service.canAccess('file-1', 'file', 'user-ext', 'viewer')
      expect(result).toBe(true)
    })
  })

  describe('grant and list', () => {
    it('lists collaborators on an object', async () => {
      await service.grant({
        objectId: 'file-1',
        objectType: 'file',
        subjectId: 'user-a',
        role: 'viewer',
        grantedBy: 'owner-1'
      })
      await service.grant({
        objectId: 'file-1',
        objectType: 'file',
        subjectId: 'user-b',
        role: 'editor',
        grantedBy: 'owner-1'
      })

      const collabs = await service.listCollaborators('file-1')
      expect(collabs).toHaveLength(2)
      expect(collabs.map(c => c.subjectId)).toContain('user-a')
      expect(collabs.map(c => c.subjectId)).toContain('user-b')
    })

    it('revoke removes access', async () => {
      await service.grant({
        objectId: 'file-1',
        objectType: 'file',
        subjectId: 'user-a',
        role: 'viewer',
        grantedBy: 'owner-1'
      })

      await service.revoke('file-1', 'user-a')

      const effective = await service.resolve('file-1', 'file', 'user-a')
      expect(effective).toBeNull()
    })

    it('listAccessibleSpaces returns only space-type grants', async () => {
      await service.grant({
        objectId: 'space-1',
        objectType: 'space',
        subjectId: 'user-ext',
        role: 'viewer',
        grantedBy: 'owner-1'
      })
      await service.grant({
        objectId: 'file-1',
        objectType: 'file',
        subjectId: 'user-ext',
        role: 'editor',
        grantedBy: 'owner-1'
      })

      const spaces = await service.listAccessibleSpaces('user-ext')
      expect(spaces).toHaveLength(1)
      expect(spaces[0]!.objectId).toBe('space-1')
      expect(spaces[0]!.objectType).toBe('space')
    })
  })
})
