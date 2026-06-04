/**
 * Tests for GET /api/storage/shared
 *
 * This endpoint returns all files, folders, and spaces that have been shared
 * with the authenticated user by someone else. Items the user owns themselves
 * are excluded even when a permission record exists. Each result row includes
 * full catalog metadata and a sharedBy object describing the granter.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ICatalogRepository } from '../../../core/ports/repositories/catalog.repository.port'
import type { IPermissionRepository } from '../../../core/ports/repositories/permission.repository.port'
import type { IUserRepository } from '../../../core/ports/repositories/user.repository.port'
import type { IShareInviteRepository } from '../../../core/ports/repositories/share-invite.repository.port'
import type { ObjectPermission } from '../../../core/domain/permission'
import type { ShareInvite } from '../../../core/domain/share-invite'
import type { FileEntry, Space } from '../../../core/domain/catalog'
import type { LocalUser } from '../../../core/domain/user'
import type { JanusUser } from '../../../app/auth'
import { PermissionService } from '../../../core/services/permission.service'

// ---------------------------------------------------------------------------
// Nitro global shims
//
// Nitro auto-imports defineEventHandler, createError, getCookie, and
// useRuntimeConfig at build time, but they don't exist in Vitest's Node
// environment. We shim them on globalThis before importing the handler.
//
// defineEventHandler is a passthrough — it just returns the inner
// function so we can call (handler as any)(fakeEvent) directly in tests.
// ---------------------------------------------------------------------------
;(globalThis as any).defineEventHandler = (fn: (event: unknown) => unknown) => fn
;(globalThis as any).createError = (
  data: { statusCode?: number; message?: string; statusMessage?: string }
) => {
  const err = new Error(data.message || data.statusMessage || 'Error') as Error & {
    statusCode: number
  }
  err.statusCode = data.statusCode || 500
  return err
}
;(globalThis as any).getCookie = () => undefined
;(globalThis as any).useRuntimeConfig = () => ({
  authBypass: false,
  janus: { url: '', appIdentifier: '' },
  storage: { driver: 'local' },
  s3: { bucket: '', region: '', endpoint: '', accessKeyId: '', secretAccessKey: '' }
})

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

/** In-memory permission store keyed by objectId+subjectId for quick lookup. */
class FakePermissionRepository implements IPermissionRepository {
  private store: ObjectPermission[] = []

  seed(perms: ObjectPermission[]) {
    this.store = [...perms]
  }

  async grant(p: ObjectPermission): Promise<ObjectPermission> {
    this.store.push(p)
    return p
  }

  async revoke(objectId: string, subjectId: string): Promise<void> {
    this.store = this.store.filter(
      (p) => !(p.objectId === objectId && p.subjectId === subjectId)
    )
  }

  async getPermission(objectId: string, subjectId: string): Promise<ObjectPermission | null> {
    return this.store.find((p) => p.objectId === objectId && p.subjectId === subjectId) ?? null
  }

  async listByObject(objectId: string): Promise<ObjectPermission[]> {
    return this.store.filter((p) => p.objectId === objectId)
  }

  async listBySubject(subjectId: string): Promise<ObjectPermission[]> {
    return this.store.filter((p) => p.subjectId === subjectId)
  }

  async listBySubjectAndType(
    subjectId: string,
    objectType: ObjectPermission['objectType']
  ): Promise<ObjectPermission[]> {
    return this.store.filter(
      (p) => p.subjectId === subjectId && p.objectType === objectType
    )
  }

  async listByGranter(grantedBy: string): Promise<ObjectPermission[]> {
    return this.store.filter((p) => p.grantedBy === grantedBy)
  }
}

/**
 * In-memory catalog store. Only getEntry and getSpace are exercised by
 * this endpoint — the remaining methods are no-op stubs to satisfy the
 * interface.
 */
class FakeCatalogRepository implements ICatalogRepository {
  private entries: Map<string, FileEntry> = new Map()
  private spaces: Map<string, Space> = new Map()

  seedEntry(entry: FileEntry) {
    this.entries.set(entry.id, entry)
  }

  seedSpace(space: Space) {
    this.spaces.set(space.id, space)
  }

  async getEntry(id: string): Promise<FileEntry | null> {
    return this.entries.get(id) ?? null
  }

  async getSpace(id: string): Promise<Space | null> {
    return this.spaces.get(id) ?? null
  }

  // Remaining ICatalogRepository methods — not exercised by this endpoint
  async createSpace(space: Space): Promise<Space> { return space }
  async listSpaces(): Promise<Space[]> { return [] }
  async updateSpace(): Promise<Space | null> { return null }
  async deleteSpace(): Promise<void> {}
  async createEntry(entry: FileEntry): Promise<FileEntry> { return entry }
  async listChildren(): Promise<FileEntry[]> { return [] }
  async findChildByName(): Promise<FileEntry | null> { return null }
  async updateEntry(): Promise<FileEntry | null> { return null }
  async getEntryByBlobKey(): Promise<FileEntry | null> { return null }
  async deleteEntry(): Promise<void> {}
  async trashEntry(): Promise<void> {}
  async trashBySpace(): Promise<void> {}
  async restoreEntry(): Promise<void> {}
  async listTrashed(): Promise<FileEntry[]> { return [] }
  async listStarred(): Promise<FileEntry[]> { return [] }
  async listRecent(): Promise<FileEntry[]> { return [] }
  async createTag(tag: any): Promise<any> { return tag }
  async listTags(): Promise<any[]> { return [] }
  async deleteTag(): Promise<void> {}
  async tagFile(): Promise<void> {}
  async untagFile(): Promise<void> {}
  async getFileTags(): Promise<any[]> { return [] }
  async listFilesByTag(): Promise<FileEntry[]> { return [] }
  async addMember(): Promise<void> {}
  async removeMember(): Promise<void> {}
  async getFileMembers(): Promise<string[]> { return [] }
}

/** In-memory user store. */
class FakeUserRepository implements IUserRepository {
  private store: LocalUser[] = []

  seed(users: LocalUser[]) {
    this.store = [...users]
  }

  async upsert(user: LocalUser): Promise<void> {
    this.store.push(user)
  }

  async findByEmail(query: string): Promise<LocalUser[]> {
    return this.store.filter((u) => u.email.includes(query))
  }

  async findByEmailGlobal(query: string): Promise<LocalUser[]> {
    return this.store.filter((u) => u.email.includes(query))
  }

  async findByExactEmail(email: string): Promise<LocalUser | null> {
    return this.store.find((u) => u.email === email) ?? null
  }

  async getById(id: string): Promise<LocalUser | null> {
    return this.store.find((u) => u.id === id) ?? null
  }

  async getByIds(ids: string[]): Promise<LocalUser[]> {
    return this.store.filter((u) => ids.includes(u.id))
  }
}

/** In-memory share invite store. */
class FakeShareInviteRepository implements IShareInviteRepository {
  private store: ShareInvite[] = []

  seed(invites: ShareInvite[]) {
    this.store = [...invites]
  }

  async create(invite: ShareInvite): Promise<ShareInvite> {
    this.store.push(invite)
    return invite
  }

  async listByObject(objectId: string): Promise<ShareInvite[]> {
    return this.store.filter((i) => i.objectId === objectId)
  }

  async listByEmail(email: string): Promise<ShareInvite[]> {
    return this.store.filter((i) => i.email === email.toLowerCase())
  }

  async delete(id: string): Promise<void> {
    this.store = this.store.filter((i) => i.id !== id)
  }

  async deleteByObjectAndEmail(objectId: string, email: string): Promise<void> {
    this.store = this.store.filter(
      (i) => !(i.objectId === objectId && i.email === email.toLowerCase())
    )
  }

  async listByGranter(grantedBy: string): Promise<ShareInvite[]> {
    return this.store.filter((i) => i.grantedBy === grantedBy)
  }
}

// ---------------------------------------------------------------------------
// Module mocks
//
// vi.mock is hoisted above all imports, so these run before the handler
// module loads. The mock factories return objects whose properties
// delegate to the in-memory fakes above, giving us full control over
// the data each test sees without any vi.fn() or vi.spyOn() in the
// test body.
//
// The container mock uses getters so that each test's beforeEach
// re-seeding is picked up — a plain object would capture stale refs.
// ---------------------------------------------------------------------------

const fakePermissionRepo = new FakePermissionRepository()
const fakeCatalogRepo = new FakeCatalogRepository()
const fakeUserRepo = new FakeUserRepository()
const fakeShareInviteRepo = new FakeShareInviteRepository()

let fakeAuthUser: JanusUser | null = {
  sub: 'user-1',
  email: 'user@example.com',
  firstName: 'Alice',
  lastName: 'User',
  avatar: null,
  tid: 'tenant-1',
  permissions: []
}

vi.mock('../../../app/container', () => ({
  container: {
    get permissionService() {
      return new PermissionService(fakePermissionRepo, fakeCatalogRepo)
    },
    get catalogRepo() {
      return fakeCatalogRepo
    },
    get userRepo() {
      return fakeUserRepo
    },
    get shareInviteRepo() {
      return fakeShareInviteRepo
    }
  }
}))

vi.mock('../../../app/auth', () => ({
  requireAuth: async (_event: unknown) => {
    if (!fakeAuthUser) {
      const err = new Error('Unauthorized') as Error & { statusCode: number }
      err.statusCode = 401
      throw err
    }
    return fakeAuthUser
  }
}))

// Import the handler after mocks are in place.
const { default: handler } = await import('../shared.get')

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makePermission(overrides: Partial<ObjectPermission> = {}): ObjectPermission {
  return {
    id: 'perm-1',
    objectId: 'file-1',
    objectType: 'file',
    subjectId: 'user-1',
    role: 'viewer',
    grantedBy: 'owner-1',
    createdAt: new Date(),
    ...overrides
  }
}

function makeEntry(overrides: Partial<FileEntry> = {}): FileEntry {
  return {
    id: 'file-1',
    parentId: null,
    spaceId: 'space-1',
    name: 'report',
    type: 'file',
    mimeType: 'text/plain',
    ext: '.txt',
    sizeBytes: 1024,
    blobKey: 'owner-1/space-1/file-1.txt',
    ownerId: 'owner-1',
    starred: false,
    trashedAt: null,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    modifiedAt: new Date('2024-06-01T12:00:00Z'),
    ...overrides
  }
}

function makeSpace(overrides: Partial<Space> = {}): Space {
  return {
    id: 'space-1',
    name: 'Work',
    icon: 'folder',
    color: '#00C16A',
    ownerId: 'owner-1',
    createdAt: new Date(),
    ...overrides
  }
}

function makeUser(overrides: Partial<LocalUser> = {}): LocalUser {
  return {
    id: 'owner-1',
    email: 'owner@example.com',
    firstName: 'Bob',
    lastName: 'Owner',
    avatar: null,
    tid: 'tenant-1',
    lastSeenAt: new Date(),
    ...overrides
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/storage/shared', () => {
  beforeEach(() => {
    fakePermissionRepo.seed([])
    fakeUserRepo.seed([])
    fakeShareInviteRepo.seed([])
    fakeAuthUser = {
      sub: 'user-1',
      email: 'user@example.com',
      firstName: 'Alice',
      lastName: 'User',
      avatar: null,
      tid: 'tenant-1',
      permissions: []
    }
  })

  describe('authentication', () => {
    it('throws 401 when the request is not authenticated', async () => {
      fakeAuthUser = null

      await expect((handler as any)({})).rejects.toMatchObject({ statusCode: 401 })
    })
  })

  describe('empty state', () => {
    it('returns an empty array when the user has no shared items', async () => {
      const result = await (handler as any)({})

      expect(result).toEqual([])
    })
  })

  describe('ownership filtering', () => {
    it('excludes file entries owned by the authenticated user', async () => {
      fakePermissionRepo.seed([makePermission({ subjectId: 'user-1' })])
      // Entry is owned by user-1, same as the authenticated user
      fakeCatalogRepo.seedEntry(makeEntry({ ownerId: 'user-1' }))

      const result = await (handler as any)({})

      expect(result).toEqual([])
    })

    it('excludes space entries owned by the authenticated user', async () => {
      fakePermissionRepo.seed([
        makePermission({ objectId: 'space-1', objectType: 'space', subjectId: 'user-1' })
      ])
      // Space is owned by user-1, same as the authenticated user
      fakeCatalogRepo.seedSpace(makeSpace({ id: 'space-1', ownerId: 'user-1' }))

      const result = await (handler as any)({})

      expect(result).toEqual([])
    })

    it('excludes file entries whose catalog record does not exist', async () => {
      fakePermissionRepo.seed([makePermission({ objectId: 'ghost-file', subjectId: 'user-1' })])
      // no catalog entry seeded for 'ghost-file'

      const result = await (handler as any)({})

      expect(result).toEqual([])
    })

    it('excludes space entries whose catalog record does not exist', async () => {
      fakePermissionRepo.seed([
        makePermission({ objectId: 'ghost-space', objectType: 'space', subjectId: 'user-1' })
      ])
      // no space seeded for 'ghost-space'

      const result = await (handler as any)({})

      expect(result).toEqual([])
    })
  })

  describe('file entries', () => {
    it('returns full file metadata from the catalog entry', async () => {
      const entry = makeEntry({
        id: 'file-1',
        name: 'quarterly-report',
        ext: '.pdf',
        sizeBytes: 204800,
        blobKey: 'owner-1/space-1/file-1.pdf',
        mimeType: 'application/pdf',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        modifiedAt: new Date('2024-06-01T12:00:00Z')
      })
      fakePermissionRepo.seed([makePermission({ role: 'editor' })])
      fakeCatalogRepo.seedEntry(entry)

      const result = await (handler as any)({})

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'file-1',
        name: 'quarterly-report',
        ext: '.pdf',
        sizeBytes: 204800,
        blobKey: 'owner-1/space-1/file-1.pdf',
        mimeType: 'application/pdf',
        type: 'file',
        role: 'editor',
        createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
        modifiedAt: new Date('2024-06-01T12:00:00Z').toISOString()
      })
    })

    it('returns starred: true when the catalog entry is starred', async () => {
      fakePermissionRepo.seed([makePermission()])
      fakeCatalogRepo.seedEntry(makeEntry({ starred: true }))

      const result = await (handler as any)({})

      expect(result[0]).toMatchObject({ starred: true })
    })

    it('returns starred: false when the catalog entry is not starred', async () => {
      fakePermissionRepo.seed([makePermission()])
      fakeCatalogRepo.seedEntry(makeEntry({ starred: false }))

      const result = await (handler as any)({})

      expect(result[0]).toMatchObject({ starred: false })
    })

    it('sets type to folder when the catalog entry type is folder', async () => {
      fakePermissionRepo.seed([makePermission({ objectType: 'folder' })])
      fakeCatalogRepo.seedEntry(makeEntry({ type: 'folder', ext: null, blobKey: null }))

      const result = await (handler as any)({})

      expect(result[0]).toMatchObject({ type: 'folder' })
    })

    it('sets type to file when the catalog entry type is file', async () => {
      fakePermissionRepo.seed([makePermission()])
      fakeCatalogRepo.seedEntry(makeEntry({ type: 'file' }))

      const result = await (handler as any)({})

      expect(result[0]).toMatchObject({ type: 'file' })
    })
  })

  describe('space entries', () => {
    it('resolves the space name from the catalog record', async () => {
      fakePermissionRepo.seed([
        makePermission({ objectId: 'space-1', objectType: 'space' })
      ])
      fakeCatalogRepo.seedSpace(makeSpace({ id: 'space-1', name: 'Client Projects' }))

      const result = await (handler as any)({})

      expect(result[0]).toMatchObject({ id: 'space-1', name: 'Client Projects' })
    })

    it('sets type to folder for space entries', async () => {
      fakePermissionRepo.seed([
        makePermission({ objectId: 'space-1', objectType: 'space' })
      ])
      fakeCatalogRepo.seedSpace(makeSpace({ id: 'space-1' }))

      const result = await (handler as any)({})

      expect(result[0]).toMatchObject({ type: 'folder' })
    })
  })

  describe('sharedBy resolution', () => {
    it('populates sharedBy with granter details when the user record exists', async () => {
      fakePermissionRepo.seed([makePermission({ grantedBy: 'owner-1' })])
      fakeCatalogRepo.seedEntry(makeEntry())
      fakeUserRepo.seed([
        makeUser({ id: 'owner-1', email: 'owner@example.com', firstName: 'Bob', lastName: 'Owner', avatar: null })
      ])

      const result = await (handler as any)({})

      expect(result[0].sharedBy).toMatchObject({
        id: 'owner-1',
        email: 'owner@example.com',
        firstName: 'Bob',
        lastName: 'Owner',
        avatar: null
      })
    })

    it('sets sharedBy to null when the granter user record does not exist', async () => {
      fakePermissionRepo.seed([makePermission({ grantedBy: 'ghost-user' })])
      fakeCatalogRepo.seedEntry(makeEntry())
      // ghost-user not seeded in userRepo

      const result = await (handler as any)({})

      expect(result[0].sharedBy).toBeNull()
    })

    it('sets sharedBy to null when grantedBy is absent on the permission', async () => {
      fakePermissionRepo.seed([makePermission({ grantedBy: undefined })])
      fakeCatalogRepo.seedEntry(makeEntry())

      const result = await (handler as any)({})

      expect(result[0].sharedBy).toBeNull()
    })
  })

  describe('result shape', () => {
    it('returns separate rows for each distinct shared object', async () => {
      fakePermissionRepo.seed([
        makePermission({ id: 'perm-1', objectId: 'file-1' }),
        makePermission({ id: 'perm-2', objectId: 'file-2' })
      ])
      fakeCatalogRepo.seedEntry(makeEntry({ id: 'file-1', name: 'alpha' }))
      fakeCatalogRepo.seedEntry(makeEntry({ id: 'file-2', name: 'beta' }))

      const result = await (handler as any)({})

      expect(result).toHaveLength(2)
      const names = result.map((r: any) => r.name)
      expect(names).toContain('alpha')
      expect(names).toContain('beta')
    })

    it('includes the permission role on each result row', async () => {
      fakePermissionRepo.seed([makePermission({ role: 'editor' })])
      fakeCatalogRepo.seedEntry(makeEntry())

      const result = await (handler as any)({})

      expect(result[0]).toMatchObject({ role: 'editor' })
    })

    it('sets parentId and trashedAt to null and ownerId to empty string', async () => {
      fakePermissionRepo.seed([makePermission()])
      fakeCatalogRepo.seedEntry(makeEntry())

      const result = await (handler as any)({})

      expect(result[0]).toMatchObject({ parentId: null, trashedAt: null, ownerId: '' })
    })
  })

  describe('pending invites', () => {
    it('includes pending invites matching the user email', async () => {
      fakeShareInviteRepo.seed([{
        id: 'invite-1',
        objectId: 'file-99',
        objectType: 'file' as const,
        email: 'user@example.com',
        role: 'viewer' as const,
        grantedBy: 'owner-1',
        createdAt: new Date()
      }])
      fakeCatalogRepo.seedEntry(makeEntry({
        id: 'file-99',
        name: 'shared-via-invite',
        ownerId: 'owner-1'
      }))

      const result = await (handler as any)({})

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('shared-via-invite')
      expect(result[0].role).toBe('viewer')
    })

    it('does not duplicate items that appear in both permissions and invites', async () => {
      fakePermissionRepo.seed([makePermission({ objectId: 'file-1' })])
      fakeShareInviteRepo.seed([{
        id: 'invite-1',
        objectId: 'file-1',
        objectType: 'file' as const,
        email: 'user@example.com',
        role: 'editor' as const,
        grantedBy: 'owner-1',
        createdAt: new Date()
      }])
      fakeCatalogRepo.seedEntry(makeEntry({ id: 'file-1' }))

      const result = await (handler as any)({})

      expect(result).toHaveLength(1)
    })

    it('resolves sharedBy from the invite granter', async () => {
      fakeShareInviteRepo.seed([{
        id: 'invite-1',
        objectId: 'file-99',
        objectType: 'file' as const,
        email: 'user@example.com',
        role: 'viewer' as const,
        grantedBy: 'owner-1',
        createdAt: new Date()
      }])
      fakeCatalogRepo.seedEntry(makeEntry({ id: 'file-99', ownerId: 'owner-1' }))
      fakeUserRepo.seed([makeUser({ id: 'owner-1', email: 'owner@test.com' })])

      const result = await (handler as any)({})

      expect(result[0].sharedBy).toMatchObject({ email: 'owner@test.com' })
    })
  })
})
