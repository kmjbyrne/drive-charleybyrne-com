import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '../../../database/schema'
import { SqliteCatalogRepository } from '../../../app/repositories/sqlite-catalog.repository'
import { StorageService } from '../storage.service'
import type { Readable } from 'node:stream'
import type { IStorageRepository } from '../../ports/repositories/storage.repository.port'
import type {
  ListResult,
  ObjectInfo,
  PresignedUpload,
  PresignedDownload
} from '../../domain/storage'

class FakeStorageRepository implements IStorageRepository {
  blobs = new Map<string, { body: Buffer | Uint8Array, contentType: string }>()

  async list(): Promise<ListResult> {
    return { objects: [], prefixes: [], isTruncated: false }
  }

  async head(key: string): Promise<ObjectInfo | null> {
    const blob = this.blobs.get(key)
    if (!blob) return null
    return {
      key,
      size: blob.body.byteLength,
      lastModified: new Date(),
      etag: 'fake',
      contentType: blob.contentType
    }
  }

  async presignUpload(key: string): Promise<PresignedUpload> {
    return { url: `https://fake/${key}`, key }
  }

  async presignDownload(): Promise<PresignedDownload> {
    return { url: 'https://fake/download' }
  }

  async put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
    this.blobs.set(key, { body, contentType })
  }

  async putStream(key: string, body: Readable, contentType: string): Promise<number> {
    const chunks: Buffer[] = []
    for await (const chunk of body) chunks.push(chunk as Buffer)
    const buf = Buffer.concat(chunks)
    this.blobs.set(key, { body: buf, contentType })
    return buf.length
  }

  async createFolder(): Promise<void> {}
  async delete(key: string): Promise<void> {
    this.blobs.delete(key)
  }

  async deletePrefix(): Promise<number> {
    return 0
  }

  async copy(): Promise<void> {}
}

function createTestDb() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: './server/database/migrations' })
  return db
}

describe('StorageService', () => {
  let service: StorageService
  let fakeStorage: FakeStorageRepository
  let catalogRepo: SqliteCatalogRepository

  beforeEach(async () => {
    const db = createTestDb()
    fakeStorage = new FakeStorageRepository()
    catalogRepo = new SqliteCatalogRepository(db)

    service = new StorageService(fakeStorage, catalogRepo)

    // Seed a space for uploads
    await catalogRepo.createSpace({
      id: 'personal',
      name: 'Personal',
      icon: 'folder',
      color: '#00C16A',
      ownerId: 'user-1',
      createdAt: new Date()
    })
  })

  describe('upload', () => {
    it('writes blob to storage and creates catalog entry', async () => {
      const body = Buffer.from('hello world')

      const entry = await service.upload({
        userId: 'user-1',
        spaceId: 'personal',
        parentId: null,
        fileName: 'readme.md',
        contentType: 'text/markdown',
        body
      })

      expect(entry.name).toBe('readme')
      expect(entry.ext).toBe('.md')
      expect(entry.mimeType).toBe('text/markdown')
      expect(entry.sizeBytes).toBe(11)
      expect(entry.spaceId).toBe('personal')
      expect(entry.type).toBe('file')
      expect(entry.blobKey).toBeTruthy()

      // Blob was written
      expect(fakeStorage.blobs.has(entry.blobKey!)).toBe(true)

      // Catalog entry is persisted
      const persisted = await catalogRepo.getEntry(entry.id)
      expect(persisted).not.toBeNull()
      expect(persisted!.name).toBe('readme')
    })

    it('uploads into a folder', async () => {
      // Create a folder first
      await catalogRepo.createEntry({
        id: 'docs-folder',
        parentId: null,
        spaceId: 'personal',
        name: 'Documents',
        type: 'folder',
        mimeType: null,
        ext: null,
        sizeBytes: 0,
        blobKey: null,
        ownerId: 'user-1',
        starred: false,
        trashedAt: null,
        createdAt: new Date(),
        modifiedAt: new Date()
      })

      const entry = await service.upload({
        userId: 'user-1',
        spaceId: 'personal',
        parentId: 'docs-folder',
        fileName: 'report.pdf',
        contentType: 'application/pdf',
        body: Buffer.from('pdf content')
      })

      expect(entry.parentId).toBe('docs-folder')
      expect(entry.ext).toBe('.pdf')

      // Should appear as a child of the folder
      const children = await catalogRepo.listChildren('docs-folder', 'personal')
      expect(children).toHaveLength(1)
      expect(children[0]!.id).toBe(entry.id)
    })

    it('handles files without extensions', async () => {
      const entry = await service.upload({
        userId: 'user-1',
        spaceId: 'personal',
        parentId: null,
        fileName: 'Makefile',
        contentType: 'application/octet-stream',
        body: Buffer.from('all: build')
      })

      expect(entry.name).toBe('Makefile')
      expect(entry.ext).toBeNull()
    })

    it('creates unique IDs for each upload', async () => {
      const body = Buffer.from('data')

      const entry1 = await service.upload({
        userId: 'user-1',
        spaceId: 'personal',
        parentId: null,
        fileName: 'file.txt',
        contentType: 'text/plain',
        body
      })

      const entry2 = await service.upload({
        userId: 'user-1',
        spaceId: 'personal',
        parentId: null,
        fileName: 'file.txt',
        contentType: 'text/plain',
        body
      })

      expect(entry1.id).not.toBe(entry2.id)
      expect(entry1.blobKey).not.toBe(entry2.blobKey)
    })
  })
})
