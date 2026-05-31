/**
 * Tests for GET /api/storage/shared-by-me
 *
 * This endpoint returns all files and spaces the authenticated user has
 * shared with others, merging two sources: accepted permissions (where
 * the recipient already has an account) and pending invites (email-only,
 * not yet claimed).
 *
 * Each result row includes the object's name, ext, starred status, and
 * a sharedWith array combining both sources. The starred field was
 * previously hardcoded to false — these tests verify it now comes from
 * the catalog entry.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ICatalogRepository } from '../../../core/ports/repositories/catalog.repository.port'
import type { IPermissionRepository } from '../../../core/ports/repositories/permission.repository.port'
import type { IShareInviteRepository } from '../../../core/ports/repositories/share-invite.repository.port'
import type { IUserRepository } from '../../../core/ports/repositories/user.repository.port'
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

/** In-memory permission store. Seed with test data via seed(). */
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

/** In-memory share invite store. Seed with test data via seed(). */
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
    return this.store.filter((i) => i.email === email)
  }

  async delete(id: string): Promise<void> {
    this.store = this.store.filter((i) => i.id !== id)
  }

  async deleteByObjectAndEmail(objectId: string, email: string): Promise<void> {
    this.store = this.store.filter(
      (i) => !(i.objectId === objectId && i.email === email)
    )
  }

  async listByGranter(grantedBy: string): Promise<ShareInvite[]> {
    return this.store.filter((i) => i.grantedBy === grantedBy)
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

/** In-memory user store. Seed with test data via seed(). */
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
const fakeShareInviteRepo = new FakeShareInviteRepository()
const fakeCatalogRepo = new FakeCatalogRepository()
const fakeUserRepo = new FakeUserRepository()

let fakeAuthUser: JanusUser | null = {
  sub: 'owner-1',
  email: 'owner@example.com',
  firstName: 'Alice',
  lastName: 'Owner',
  avatar: null,
  tid: 'tenant-1',
  permissions: []
}

vi.mock('../../../app/container', () => ({
  container: {
    get permissionService() {
      return new PermissionService(fakePermissionRepo, fakeCatalogRepo)
    },
    get shareInviteRepo() {
      return fakeShareInviteRepo
    },
    get catalogRepo() {
      return fakeCatalogRepo
    },
    get userRepo() {
      return fakeUserRepo
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
// The top-level await is required because vi.mock is hoisted but the
// dynamic import must happen after the mocks are wired up.
const { default: handler } = await import('../shared-by-me.get')

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makePermission(overrides: Partial<ObjectPermission> = {}): ObjectPermission {
  return {
    id: 'perm-1',
    objectId: 'file-1',
    objectType: 'file',
    subjectId: 'user-2',
    role: 'viewer',
    grantedBy: 'owner-1',
    createdAt: new Date(),
    ...overrides
  }
}

function makeInvite(overrides: Partial<ShareInvite> = {}): ShareInvite {
  return {
    id: 'invite-1',
    objectId: 'file-1',
    objectType: 'file',
    email: 'pending@example.com',
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
    createdAt: new Date(),
    modifiedAt: new Date(),
    ...overrides
  }
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

function makeUser(overrides: Partial<LocalUser> = {}): LocalUser {
  return {
    id: 'user-2',
    email: 'bob@example.com',
    firstName: 'Bob',
    lastName: 'Smith',
    avatar: null,
    tid: 'tenant-1',
    lastSeenAt: new Date(),
    ...overrides
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/storage/shared-by-me', () => {
  beforeEach(() => {
    fakePermissionRepo.seed([])
    fakeShareInviteRepo.seed([])
    fakeUserRepo.seed([])
    fakeAuthUser = {
      sub: 'owner-1',
      email: 'owner@example.com',
      firstName: 'Alice',
      lastName: 'Owner',
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
    it('returns an empty array when the user has shared nothing', async () => {
      const result = await (handler as any)({})

      expect(result).toEqual([])
    })
  })

  describe('file entries', () => {
    it('returns the correct name and ext from the catalog entry', async () => {
      fakePermissionRepo.seed([makePermission()])
      fakeUserRepo.seed([makeUser()])
      fakeCatalogRepo.seedEntry(makeEntry({ name: 'quarterly-report', ext: '.pdf' }))

      const result = await (handler as any)({})

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ name: 'quarterly-report', ext: '.pdf' })
    })

    it('returns starred: true when the catalog entry is starred', async () => {
      fakePermissionRepo.seed([makePermission()])
      fakeUserRepo.seed([makeUser()])
      fakeCatalogRepo.seedEntry(makeEntry({ starred: true }))

      const result = await (handler as any)({})

      expect(result[0]).toMatchObject({ starred: true })
    })

    it('returns starred: false when the catalog entry is not starred', async () => {
      fakePermissionRepo.seed([makePermission()])
      fakeUserRepo.seed([makeUser()])
      fakeCatalogRepo.seedEntry(makeEntry({ starred: false }))

      const result = await (handler as any)({})

      expect(result[0]).toMatchObject({ starred: false })
    })

    it('uses the objectId as the name when no catalog entry exists', async () => {
      fakePermissionRepo.seed([makePermission({ objectId: 'unknown-obj' })])
      fakeUserRepo.seed([makeUser()])
      // no catalog entry seeded for 'unknown-obj'

      const result = await (handler as any)({})

      expect(result[0]).toMatchObject({ objectId: 'unknown-obj', name: 'unknown-obj' })
    })

    it('sets objectType to folder when the catalog entry type is folder', async () => {
      fakePermissionRepo.seed([makePermission({ objectType: 'folder' })])
      fakeUserRepo.seed([makeUser()])
      fakeCatalogRepo.seedEntry(makeEntry({ type: 'folder', ext: null, blobKey: null }))

      const result = await (handler as any)({})

      expect(result[0]).toMatchObject({ objectType: 'folder' })
    })
  })

  describe('space entries', () => {
    it('resolves the space name from the catalog space record', async () => {
      fakePermissionRepo.seed([
        makePermission({ objectId: 'space-1', objectType: 'space' })
      ])
      fakeUserRepo.seed([makeUser()])
      fakeCatalogRepo.seedSpace(makeSpace({ id: 'space-1', name: 'Work Projects' }))

      const result = await (handler as any)({})

      expect(result[0]).toMatchObject({
        objectId: 'space-1',
        objectType: 'space',
        name: 'Work Projects'
      })
    })

    it('uses the objectId as the name when the space record does not exist', async () => {
      fakePermissionRepo.seed([
        makePermission({ objectId: 'missing-space', objectType: 'space' })
      ])
      fakeUserRepo.seed([makeUser()])

      const result = await (handler as any)({})

      expect(result[0]).toMatchObject({ name: 'missing-space' })
    })
  })

  describe('sharedWith — accepted permissions', () => {
    it('includes user details for accepted permissions', async () => {
      fakePermissionRepo.seed([makePermission({ subjectId: 'user-2', role: 'editor' })])
      fakeUserRepo.seed([
        makeUser({ id: 'user-2', email: 'bob@example.com', firstName: 'Bob', lastName: 'Smith' })
      ])
      fakeCatalogRepo.seedEntry(makeEntry())

      const result = await (handler as any)({})
      const sharedWith = result[0].sharedWith

      expect(sharedWith).toHaveLength(1)
      expect(sharedWith[0]).toMatchObject({
        email: 'bob@example.com',
        firstName: 'Bob',
        lastName: 'Smith',
        role: 'editor',
        pending: false
      })
    })

    it('falls back to null user details when the user record cannot be found', async () => {
      fakePermissionRepo.seed([makePermission({ subjectId: 'ghost-user' })])
      // ghost-user not seeded in userRepo

      const result = await (handler as any)({})
      const sharedWith = result[0].sharedWith

      expect(sharedWith[0]).toMatchObject({
        email: null,
        firstName: null,
        lastName: null,
        pending: false
      })
    })
  })

  describe('sharedWith — pending invites', () => {
    it('includes pending invites with pending: true', async () => {
      fakeShareInviteRepo.seed([
        makeInvite({ email: 'pending@example.com', role: 'viewer' })
      ])
      // No accepted permissions, so no catalog entry lookup is triggered via
      // permissions — but the objectType comes from the invite
      // and the entry path is still walked for name resolution.
      fakeCatalogRepo.seedEntry(makeEntry())

      const result = await (handler as any)({})
      const sharedWith = result[0].sharedWith

      expect(sharedWith).toHaveLength(1)
      expect(sharedWith[0]).toMatchObject({
        email: 'pending@example.com',
        firstName: null,
        lastName: null,
        avatar: null,
        role: 'viewer',
        pending: true
      })
    })
  })

  describe('merging permissions and invites', () => {
    it('merges accepted permissions and pending invites for the same object', async () => {
      fakePermissionRepo.seed([makePermission({ subjectId: 'user-2', role: 'editor' })])
      fakeShareInviteRepo.seed([makeInvite({ email: 'pending@example.com', role: 'viewer' })])
      fakeUserRepo.seed([makeUser({ id: 'user-2' })])
      fakeCatalogRepo.seedEntry(makeEntry())

      const result = await (handler as any)({})

      // Still one result row for the object
      expect(result).toHaveLength(1)

      const sharedWith = result[0].sharedWith
      // Two entries: one accepted, one pending
      expect(sharedWith).toHaveLength(2)
      expect(sharedWith.some((s: any) => s.pending === false)).toBe(true)
      expect(sharedWith.some((s: any) => s.pending === true)).toBe(true)
    })

    it('deduplicates the object when it appears in both permissions and invites', async () => {
      fakePermissionRepo.seed([makePermission({ objectId: 'file-1' })])
      fakeShareInviteRepo.seed([makeInvite({ objectId: 'file-1' })])
      fakeUserRepo.seed([makeUser()])
      fakeCatalogRepo.seedEntry(makeEntry({ id: 'file-1' }))

      const result = await (handler as any)({})

      // The object should appear exactly once in the results
      expect(result.filter((r: any) => r.objectId === 'file-1')).toHaveLength(1)
    })

    it('returns separate rows for different shared objects', async () => {
      fakePermissionRepo.seed([
        makePermission({ id: 'perm-1', objectId: 'file-1', subjectId: 'user-2' }),
        makePermission({ id: 'perm-2', objectId: 'file-2', subjectId: 'user-2' })
      ])
      fakeUserRepo.seed([makeUser({ id: 'user-2' })])
      fakeCatalogRepo.seedEntry(makeEntry({ id: 'file-1', name: 'alpha' }))
      fakeCatalogRepo.seedEntry(makeEntry({ id: 'file-2', name: 'beta' }))

      const result = await (handler as any)({})

      expect(result).toHaveLength(2)
      const names = result.map((r: any) => r.name)
      expect(names).toContain('alpha')
      expect(names).toContain('beta')
    })
  })

  describe('starred field correctness', () => {
    it('reflects the starred value from the catalog entry, not a hardcoded false', async () => {
      fakePermissionRepo.seed([
        makePermission({ id: 'perm-a', objectId: 'starred-file', subjectId: 'user-2' }),
        makePermission({ id: 'perm-b', objectId: 'plain-file', subjectId: 'user-2' })
      ])
      fakeUserRepo.seed([makeUser({ id: 'user-2' })])
      fakeCatalogRepo.seedEntry(makeEntry({ id: 'starred-file', starred: true }))
      fakeCatalogRepo.seedEntry(makeEntry({ id: 'plain-file', starred: false }))

      const result = await (handler as any)({})

      const starred = result.find((r: any) => r.objectId === 'starred-file')
      const plain = result.find((r: any) => r.objectId === 'plain-file')

      expect(starred.starred).toBe(true)
      expect(plain.starred).toBe(false)
    })
  })
})
