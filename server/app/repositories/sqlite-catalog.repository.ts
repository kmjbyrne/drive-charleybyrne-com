import { eq, and, desc, isNull, isNotNull } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { ICatalogRepository } from '../../core/ports/repositories/catalog.repository.port'
import type {
  FileEntry,
  Space,
  Tag,
  FileTag,
  FileMember
} from '../../core/domain/catalog'
import * as schema from '../../database/schema'

export class SqliteCatalogRepository implements ICatalogRepository {
  constructor(
    private readonly db: BetterSQLite3Database<typeof schema>
  ) {}

  // -- Spaces --

  async createSpace(space: Space): Promise<Space> {
    await this.db.insert(schema.spaces).values({
      id: space.id,
      name: space.name,
      icon: space.icon,
      color: space.color,
      ownerId: space.ownerId,
      createdAt: space.createdAt
    })
    return space
  }

  async getSpace(id: string): Promise<Space | null> {
    const row = await this.db
      .select()
      .from(schema.spaces)
      .where(eq(schema.spaces.id, id))
      .get()
    return row ?? null
  }

  async listSpaces(ownerId: string): Promise<Space[]> {
    return this.db
      .select()
      .from(schema.spaces)
      .where(eq(schema.spaces.ownerId, ownerId))
      .all()
  }

  async updateSpace(
    id: string,
    data: Partial<Pick<Space, 'name' | 'icon' | 'color'>>
  ): Promise<Space | null> {
    await this.db
      .update(schema.spaces)
      .set(data)
      .where(eq(schema.spaces.id, id))
    return this.getSpace(id)
  }

  async deleteSpace(id: string): Promise<void> {
    await this.db.delete(schema.spaces).where(eq(schema.spaces.id, id))
  }

  // -- File entries --

  async createEntry(entry: FileEntry): Promise<FileEntry> {
    await this.db.insert(schema.fileEntries).values({
      id: entry.id,
      parentId: entry.parentId,
      spaceId: entry.spaceId,
      name: entry.name,
      type: entry.type,
      mimeType: entry.mimeType,
      ext: entry.ext,
      sizeBytes: entry.sizeBytes,
      blobKey: entry.blobKey,
      ownerId: entry.ownerId,
      starred: entry.starred,
      createdAt: entry.createdAt,
      modifiedAt: entry.modifiedAt
    })
    return entry
  }

  async getEntry(id: string): Promise<FileEntry | null> {
    const row = await this.db
      .select()
      .from(schema.fileEntries)
      .where(eq(schema.fileEntries.id, id))
      .get()
    return (row as FileEntry | undefined) ?? null
  }

  async listChildren(
    parentId: string | null,
    spaceId: string
  ): Promise<FileEntry[]> {
    if (parentId === null) {
      return this.db
        .select()
        .from(schema.fileEntries)
        .where(
          and(
            eq(schema.fileEntries.spaceId, spaceId),
            isNull(schema.fileEntries.parentId),
            isNull(schema.fileEntries.trashedAt)
          )
        )
        .all() as FileEntry[]
    }

    return this.db
      .select()
      .from(schema.fileEntries)
      .where(
        and(
          eq(schema.fileEntries.parentId, parentId),
          isNull(schema.fileEntries.trashedAt)
        )
      )
      .all() as FileEntry[]
  }

  async findChildByName(
    parentId: string | null,
    spaceId: string,
    name: string
  ): Promise<FileEntry | null> {
    const conditions = parentId === null
      ? and(
          eq(schema.fileEntries.spaceId, spaceId),
          isNull(schema.fileEntries.parentId),
          eq(schema.fileEntries.name, name),
          isNull(schema.fileEntries.trashedAt)
        )
      : and(
          eq(schema.fileEntries.parentId, parentId),
          eq(schema.fileEntries.name, name),
          isNull(schema.fileEntries.trashedAt)
        )

    const row = await this.db
      .select()
      .from(schema.fileEntries)
      .where(conditions)
      .get()
    return (row as FileEntry | undefined) ?? null
  }

  async updateEntry(
    id: string,
    data: Partial<Pick<FileEntry, 'name' | 'starred' | 'parentId' | 'modifiedAt'>>
  ): Promise<FileEntry | null> {
    await this.db
      .update(schema.fileEntries)
      .set(data)
      .where(eq(schema.fileEntries.id, id))
    return this.getEntry(id)
  }

  async getEntryByBlobKey(blobKey: string): Promise<FileEntry | null> {
    const row = await this.db
      .select()
      .from(schema.fileEntries)
      .where(eq(schema.fileEntries.blobKey, blobKey))
      .get()
    return (row as FileEntry | undefined) ?? null
  }

  async deleteEntry(id: string): Promise<void> {
    await this.db
      .delete(schema.fileEntries)
      .where(eq(schema.fileEntries.id, id))
  }

  async trashEntry(id: string): Promise<void> {
    await this.db
      .update(schema.fileEntries)
      .set({ trashedAt: new Date() })
      .where(eq(schema.fileEntries.id, id))
  }

  async trashBySpace(spaceId: string): Promise<void> {
    await this.db
      .update(schema.fileEntries)
      .set({ trashedAt: new Date() })
      .where(eq(schema.fileEntries.spaceId, spaceId))
  }

  async restoreEntry(id: string): Promise<void> {
    await this.db
      .update(schema.fileEntries)
      .set({ trashedAt: null })
      .where(eq(schema.fileEntries.id, id))
  }

  async listTrashed(ownerId: string): Promise<FileEntry[]> {
    return this.db
      .select()
      .from(schema.fileEntries)
      .where(
        and(
          eq(schema.fileEntries.ownerId, ownerId),
          isNotNull(schema.fileEntries.trashedAt)
        )
      )
      .orderBy(desc(schema.fileEntries.trashedAt))
      .all() as FileEntry[]
  }

  async listStarred(ownerId: string): Promise<FileEntry[]> {
    return this.db
      .select()
      .from(schema.fileEntries)
      .where(
        and(
          eq(schema.fileEntries.ownerId, ownerId),
          eq(schema.fileEntries.starred, true),
          isNull(schema.fileEntries.trashedAt)
        )
      )
      .all() as FileEntry[]
  }

  async listRecent(ownerId: string, limit: number): Promise<FileEntry[]> {
    return this.db
      .select()
      .from(schema.fileEntries)
      .where(
        and(
          eq(schema.fileEntries.ownerId, ownerId),
          isNull(schema.fileEntries.trashedAt)
        )
      )
      .orderBy(desc(schema.fileEntries.modifiedAt))
      .limit(limit)
      .all() as FileEntry[]
  }

  // -- Tags --

  async createTag(tag: Tag): Promise<Tag> {
    await this.db.insert(schema.tags).values(tag)
    return tag
  }

  async listTags(ownerId: string): Promise<Tag[]> {
    return this.db
      .select()
      .from(schema.tags)
      .where(eq(schema.tags.ownerId, ownerId))
      .all()
  }

  async deleteTag(id: string, ownerId: string): Promise<void> {
    await this.db.delete(schema.fileTags).where(eq(schema.fileTags.tagId, id))
    await this.db
      .delete(schema.tags)
      .where(and(eq(schema.tags.id, id), eq(schema.tags.ownerId, ownerId)))
  }

  async tagFile(fileTag: FileTag): Promise<void> {
    await this.db.insert(schema.fileTags).values(fileTag)
  }

  async untagFile(fileTag: FileTag): Promise<void> {
    await this.db
      .delete(schema.fileTags)
      .where(
        and(
          eq(schema.fileTags.fileId, fileTag.fileId),
          eq(schema.fileTags.tagId, fileTag.tagId)
        )
      )
  }

  async getFileTags(fileId: string): Promise<Tag[]> {
    const rows = await this.db
      .select({ id: schema.tags.id, label: schema.tags.label, color: schema.tags.color, ownerId: schema.tags.ownerId })
      .from(schema.fileTags)
      .innerJoin(schema.tags, eq(schema.fileTags.tagId, schema.tags.id))
      .where(eq(schema.fileTags.fileId, fileId))
      .all()
    return rows
  }

  async listFilesByTag(tagId: string, ownerId: string): Promise<FileEntry[]> {
    return this.db
      .select({
        id: schema.fileEntries.id,
        parentId: schema.fileEntries.parentId,
        spaceId: schema.fileEntries.spaceId,
        name: schema.fileEntries.name,
        type: schema.fileEntries.type,
        mimeType: schema.fileEntries.mimeType,
        ext: schema.fileEntries.ext,
        sizeBytes: schema.fileEntries.sizeBytes,
        blobKey: schema.fileEntries.blobKey,
        ownerId: schema.fileEntries.ownerId,
        starred: schema.fileEntries.starred,
        trashedAt: schema.fileEntries.trashedAt,
        createdAt: schema.fileEntries.createdAt,
        modifiedAt: schema.fileEntries.modifiedAt
      })
      .from(schema.fileTags)
      .innerJoin(schema.fileEntries, eq(schema.fileTags.fileId, schema.fileEntries.id))
      .innerJoin(schema.tags, eq(schema.fileTags.tagId, schema.tags.id))
      .where(and(
        eq(schema.fileTags.tagId, tagId),
        eq(schema.tags.ownerId, ownerId),
        isNull(schema.fileEntries.trashedAt)
      ))
      .all() as FileEntry[]
  }

  // -- Members --

  async addMember(member: FileMember): Promise<void> {
    await this.db.insert(schema.fileMembers).values(member)
  }

  async removeMember(member: FileMember): Promise<void> {
    await this.db
      .delete(schema.fileMembers)
      .where(
        and(
          eq(schema.fileMembers.fileId, member.fileId),
          eq(schema.fileMembers.userId, member.userId)
        )
      )
  }

  async getFileMembers(fileId: string): Promise<string[]> {
    const rows = await this.db
      .select({ userId: schema.fileMembers.userId })
      .from(schema.fileMembers)
      .where(eq(schema.fileMembers.fileId, fileId))
      .all()
    return rows.map(r => r.userId)
  }
}
