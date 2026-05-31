export interface FileEntry {
  id: string
  parentId: string | null
  spaceId: string
  name: string
  type: 'folder' | 'file'
  mimeType: string | null
  ext: string | null
  sizeBytes: number
  // Key that maps to the blob in the storage backend (null for folders)
  blobKey: string | null
  ownerId: string
  starred: boolean
  trashedAt: Date | null
  createdAt: Date
  modifiedAt: Date
}

export interface Space {
  id: string
  name: string
  icon: string
  color: string
  ownerId: string
  createdAt: Date
}

export interface Tag {
  id: string
  label: string
  color: string
  ownerId: string
}

export interface FileTag {
  fileId: string
  tagId: string
}

export interface FileMember {
  fileId: string
  userId: string
}
