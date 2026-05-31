import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '../../../database/schema'
import { SqliteCatalogRepository } from '../sqlite-catalog.repository'
import type { Space, FileEntry } from '../../../core/domain/catalog'

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
    ownerId: 'user-1',
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
    blobKey: 'user-1/space-1/entry-1.txt',
    ownerId: 'user-1',
    starred: false,
    trashedAt: null,
    createdAt: new Date(),
    modifiedAt: new Date(),
    ...overrides
  }
}

describe('SqliteCatalogRepository', () => {
  let repo: SqliteCatalogRepository

  beforeEach(() => {
    const db = createTestDb()
    repo = new SqliteCatalogRepository(db)
  })

  describe('spaces', () => {
    it('creates and retrieves a space', async () => {
      const space = makeSpace()
      await repo.createSpace(space)

      const found = await repo.getSpace('space-1')
      expect(found).not.toBeNull()
      expect(found!.name).toBe('Personal')
      expect(found!.color).toBe('#00C16A')
    })

    it('lists spaces by owner', async () => {
      await repo.createSpace(makeSpace({ id: 's1', ownerId: 'user-1' }))
      await repo.createSpace(makeSpace({ id: 's2', ownerId: 'user-1' }))
      await repo.createSpace(makeSpace({ id: 's3', ownerId: 'user-2' }))

      const spaces = await repo.listSpaces('user-1')
      expect(spaces).toHaveLength(2)
    })

    it('updates a space', async () => {
      await repo.createSpace(makeSpace())
      const updated = await repo.updateSpace('space-1', { name: 'Work' })
      expect(updated!.name).toBe('Work')
    })

    it('deletes a space and cascades to entries', async () => {
      await repo.createSpace(makeSpace())
      await repo.createEntry(makeEntry())

      await repo.deleteSpace('space-1')

      const space = await repo.getSpace('space-1')
      expect(space).toBeNull()

      const entry = await repo.getEntry('entry-1')
      expect(entry).toBeNull()
    })
  })

  describe('file entries', () => {
    beforeEach(async () => {
      await repo.createSpace(makeSpace())
    })

    it('creates and retrieves an entry', async () => {
      await repo.createEntry(makeEntry())
      const found = await repo.getEntry('entry-1')
      expect(found).not.toBeNull()
      expect(found!.name).toBe('test-file')
      expect(found!.sizeBytes).toBe(1024)
    })

    it('lists children of a space root', async () => {
      await repo.createEntry(makeEntry({ id: 'e1', parentId: null }))
      await repo.createEntry(makeEntry({ id: 'e2', parentId: null }))

      const children = await repo.listChildren(null, 'space-1')
      expect(children).toHaveLength(2)
    })

    it('lists children of a folder', async () => {
      const folder = makeEntry({ id: 'folder-1', type: 'folder', parentId: null })
      await repo.createEntry(folder)
      await repo.createEntry(makeEntry({ id: 'child-1', parentId: 'folder-1' }))
      await repo.createEntry(makeEntry({ id: 'child-2', parentId: 'folder-1' }))

      const children = await repo.listChildren('folder-1', 'space-1')
      expect(children).toHaveLength(2)
    })

    it('updates entry name and starred', async () => {
      await repo.createEntry(makeEntry())
      const updated = await repo.updateEntry('entry-1', {
        name: 'renamed',
        starred: true
      })
      expect(updated!.name).toBe('renamed')
      expect(updated!.starred).toBe(true)
    })

    it('deletes an entry', async () => {
      await repo.createEntry(makeEntry())
      await repo.deleteEntry('entry-1')
      const found = await repo.getEntry('entry-1')
      expect(found).toBeNull()
    })

    it('lists starred entries', async () => {
      await repo.createEntry(makeEntry({ id: 'e1', starred: true }))
      await repo.createEntry(makeEntry({ id: 'e2', starred: false }))
      await repo.createEntry(makeEntry({ id: 'e3', starred: true }))

      const starred = await repo.listStarred('user-1')
      expect(starred).toHaveLength(2)
    })

    it('lists recent entries ordered by modifiedAt', async () => {
      const old = new Date('2025-01-01')
      const mid = new Date('2025-06-01')
      const recent = new Date('2025-12-01')

      await repo.createEntry(makeEntry({ id: 'e1', modifiedAt: old }))
      await repo.createEntry(makeEntry({ id: 'e2', modifiedAt: recent }))
      await repo.createEntry(makeEntry({ id: 'e3', modifiedAt: mid }))

      const recents = await repo.listRecent('user-1', 2)
      expect(recents).toHaveLength(2)
      expect(recents[0]!.id).toBe('e2')
      expect(recents[1]!.id).toBe('e3')
    })
  })

  describe('tags', () => {
    beforeEach(async () => {
      await repo.createSpace(makeSpace())
      await repo.createEntry(makeEntry())
    })

    it('creates and lists tags', async () => {
      await repo.createTag({ id: 't1', label: 'Important', color: '#eab308', ownerId: 'user-1' })
      await repo.createTag({ id: 't2', label: 'Tax', color: '#dc2626', ownerId: 'user-1' })

      const tags = await repo.listTags('user-1')
      expect(tags).toHaveLength(2)
    })

    it('tags and untags a file', async () => {
      await repo.createTag({ id: 't1', label: 'Important', color: '#eab308', ownerId: 'user-1' })

      await repo.tagFile({ fileId: 'entry-1', tagId: 't1' })
      let fileTags = await repo.getFileTags('entry-1')
      expect(fileTags).toHaveLength(1)
      expect(fileTags[0]!.label).toBe('Important')

      await repo.untagFile({ fileId: 'entry-1', tagId: 't1' })
      fileTags = await repo.getFileTags('entry-1')
      expect(fileTags).toHaveLength(0)
    })
  })

  describe('members', () => {
    beforeEach(async () => {
      await repo.createSpace(makeSpace())
      await repo.createEntry(makeEntry())
    })

    it('adds and lists members', async () => {
      await repo.addMember({ fileId: 'entry-1', userId: 'user-1' })
      await repo.addMember({ fileId: 'entry-1', userId: 'user-2' })

      const members = await repo.getFileMembers('entry-1')
      expect(members).toHaveLength(2)
      expect(members).toContain('user-1')
      expect(members).toContain('user-2')
    })

    it('removes a member', async () => {
      await repo.addMember({ fileId: 'entry-1', userId: 'user-1' })
      await repo.addMember({ fileId: 'entry-1', userId: 'user-2' })

      await repo.removeMember({ fileId: 'entry-1', userId: 'user-1' })
      const members = await repo.getFileMembers('entry-1')
      expect(members).toHaveLength(1)
      expect(members[0]).toBe('user-2')
    })
  })
})
