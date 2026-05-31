import type {
  FileEntry,
  Space,
  Tag,
  FileTag,
  FileMember
} from '../../domain/catalog'

export interface ICatalogRepository {
  // Spaces
  createSpace(space: Space): Promise<Space>
  getSpace(id: string): Promise<Space | null>
  listSpaces(ownerId: string): Promise<Space[]>
  updateSpace(id: string, data: Partial<Pick<Space, 'name' | 'icon' | 'color'>>): Promise<Space | null>
  deleteSpace(id: string): Promise<void>

  // File entries
  createEntry(entry: FileEntry): Promise<FileEntry>
  getEntry(id: string): Promise<FileEntry | null>
  listChildren(parentId: string | null, spaceId: string): Promise<FileEntry[]>
  findChildByName(parentId: string | null, spaceId: string, name: string): Promise<FileEntry | null>
  updateEntry(id: string, data: Partial<Pick<FileEntry, 'name' | 'starred' | 'parentId' | 'modifiedAt'>>): Promise<FileEntry | null>
  getEntryByBlobKey(blobKey: string): Promise<FileEntry | null>
  deleteEntry(id: string): Promise<void>
  trashEntry(id: string): Promise<void>
  trashBySpace(spaceId: string): Promise<void>
  restoreEntry(id: string): Promise<void>
  listTrashed(ownerId: string): Promise<FileEntry[]>
  listStarred(ownerId: string): Promise<FileEntry[]>
  listRecent(ownerId: string, limit: number): Promise<FileEntry[]>

  // Tags
  createTag(tag: Tag): Promise<Tag>
  listTags(ownerId: string): Promise<Tag[]>
  deleteTag(id: string, ownerId: string): Promise<void>
  tagFile(fileTag: FileTag): Promise<void>
  untagFile(fileTag: FileTag): Promise<void>
  getFileTags(fileId: string): Promise<Tag[]>
  listFilesByTag(tagId: string, ownerId: string): Promise<FileEntry[]>

  // Members / sharing
  addMember(member: FileMember): Promise<void>
  removeMember(member: FileMember): Promise<void>
  getFileMembers(fileId: string): Promise<string[]>
}
