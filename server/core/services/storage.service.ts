import type { IStorageRepository } from '../ports/repositories/storage.repository.port'
import type { ICatalogRepository } from '../ports/repositories/catalog.repository.port'
import type {
  ListResult,
  ObjectInfo,
  PresignedUpload,
  PresignedDownload
} from '../domain/storage'
import type { FileEntry } from '../domain/catalog'

// Presigned URL expiry defaults (seconds)
const UPLOAD_EXPIRY = 900
const DOWNLOAD_EXPIRY = 300

export class StorageService {
  constructor(
    private readonly storage: IStorageRepository,
    private readonly catalog: ICatalogRepository
  ) {}

  async browse(
    userId: string,
    path: string,
    continuationToken?: string,
    maxKeys?: number
  ): Promise<ListResult> {
    const prefix = this.buildPrefix(userId, path)
    return this.storage.list(prefix, continuationToken, maxKeys)
  }

  async head(userId: string, path: string): Promise<ObjectInfo | null> {
    const key = this.buildKey(userId, path)
    return this.storage.head(key)
  }

  async presignUpload(
    userId: string,
    path: string,
    contentType: string,
    maxBytes: number
  ): Promise<PresignedUpload> {
    const key = this.buildKey(userId, path)
    return this.storage.presignUpload(key, contentType, maxBytes, UPLOAD_EXPIRY)
  }

  async presignDownload(
    userId: string,
    path: string
  ): Promise<PresignedDownload> {
    const key = this.buildKey(userId, path)

    // Verify the object exists before handing out a URL
    const info = await this.storage.head(key)
    if (!info) {
      throw createError({ statusCode: 404, message: 'Object not found' })
    }

    return this.storage.presignDownload(key, DOWNLOAD_EXPIRY)
  }

  async createFolder(userId: string, path: string): Promise<void> {
    // Ensure the path ends with a trailing slash
    const normalised = path.endsWith('/') ? path : `${path}/`
    const key = this.buildKey(userId, normalised)
    await this.storage.createFolder(key)
  }

  async delete(userId: string, path: string): Promise<void> {
    const key = this.buildKey(userId, path)
    await this.storage.delete(key)
  }

  async deleteBlob(blobKey: string): Promise<void> {
    await this.storage.delete(blobKey)
  }

  async deleteFolder(userId: string, path: string): Promise<number> {
    const normalised = path.endsWith('/') ? path : `${path}/`
    const prefix = this.buildPrefix(userId, normalised)
    return this.storage.deletePrefix(prefix)
  }

  async copy(
    userId: string,
    sourcePath: string,
    destinationPath: string
  ): Promise<void> {
    const sourceKey = this.buildKey(userId, sourcePath)
    const destKey = this.buildKey(userId, destinationPath)
    await this.storage.copy(sourceKey, destKey)
  }

  async upload(params: {
    userId: string
    spaceId: string
    parentId: string | null
    fileName: string
    contentType: string
    body: Buffer | Uint8Array
  }): Promise<FileEntry> {
    const { userId, spaceId, parentId, fileName, contentType, body } = params
    const ext = fileName.includes('.') ? `.${fileName.split('.').pop()}` : null
    const id = crypto.randomUUID()
    const blobKey = this.buildKey(userId, `${spaceId}/${id}${ext || ''}`)

    // Write blob to storage backend
    await this.storage.put(blobKey, body, contentType)

    // Create catalog entry
    const now = new Date()
    const entry: FileEntry = {
      id,
      parentId,
      spaceId,
      name: ext ? fileName.replace(/\.[^.]+$/, '') : fileName,
      type: 'file',
      mimeType: contentType,
      ext,
      sizeBytes: body.byteLength,
      blobKey,
      ownerId: userId,
      starred: false,
      trashedAt: null,
      createdAt: now,
      modifiedAt: now
    }

    return this.catalog.createEntry(entry)
  }

  async updateContent(
    blobKey: string,
    content: string,
    contentType: string
  ): Promise<void> {
    const buf = Buffer.from(content, 'utf-8')
    await this.storage.put(blobKey, buf, contentType)
  }

  async move(
    userId: string,
    sourcePath: string,
    destinationPath: string
  ): Promise<void> {
    await this.copy(userId, sourcePath, destinationPath)
    await this.delete(userId, sourcePath)
  }

  /**
   * Build a full S3 key from a user ID and a relative path.
   * Strips leading slashes and any '..' segments to prevent traversal.
   */
  private buildKey(userId: string, path: string): string {
    const safe = this.sanitisePath(path)
    return `${userId}/${safe}`
  }

  /**
   * Build a prefix for listing. Always ends with '/'.
   */
  private buildPrefix(userId: string, path: string): string {
    const safe = this.sanitisePath(path)
    if (!safe) return `${userId}/`
    return `${userId}/${safe}`.replace(/\/*$/, '/')
  }

  private sanitisePath(path: string): string {
    return path
      .split('/')
      .filter(segment => segment !== '..' && segment !== '.' && segment !== '')
      .join('/')
  }
}
