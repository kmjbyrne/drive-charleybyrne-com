import { promises as fs, createWriteStream } from 'node:fs'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import type { Readable } from 'node:stream'
import { lookup } from 'mime-types'
import type { IStorageRepository } from '../../core/ports/repositories/storage.repository.port'
import type {
  ListResult,
  ObjectInfo,
  PresignedUpload,
  PresignedDownload,
  StorageObject,
  StoragePrefix
} from '../../core/domain/storage'

export class LocalStorageRepository implements IStorageRepository {
  constructor(private readonly basePath: string) {}

  async list(
    prefix: string,
    _continuationToken?: string,
    _maxKeys: number = 1000
  ): Promise<ListResult> {
    const dir = join(this.basePath, prefix)
    const objects: StorageObject[] = []
    const prefixes: StoragePrefix[] = []

    let entries: import('node:fs').Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return { objects, prefixes, isTruncated: false }
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        prefixes.push({ prefix: `${prefix}${entry.name}/` })
      } else {
        const filePath = join(dir, entry.name)
        const stat = await fs.stat(filePath)
        objects.push({
          key: `${prefix}${entry.name}`,
          size: stat.size,
          lastModified: stat.mtime,
          etag: createHash('md5').update(`${stat.ino}-${stat.size}-${stat.mtimeMs}`).digest('hex'),
          contentType: lookup(entry.name) || 'application/octet-stream'
        })
      }
    }

    return { objects, prefixes, isTruncated: false }
  }

  async head(key: string): Promise<ObjectInfo | null> {
    const filePath = join(this.basePath, key)
    try {
      const stat = await fs.stat(filePath)
      return {
        key,
        size: stat.size,
        lastModified: stat.mtime,
        etag: createHash('md5').update(`${stat.ino}-${stat.size}-${stat.mtimeMs}`).digest('hex'),
        contentType: lookup(key) || 'application/octet-stream'
      }
    } catch {
      return null
    }
  }

  async presignUpload(
    key: string,
    _contentType: string,
    _maxBytes: number,
    _expirySeconds?: number
  ): Promise<PresignedUpload> {
    // Local storage doesn't need presigned URLs; the upload API handles writes directly
    return { url: `/api/storage/upload`, key }
  }

  async presignDownload(
    key: string,
    _expirySeconds?: number
  ): Promise<PresignedDownload> {
    return { url: `/api/storage/download?key=${encodeURIComponent(key)}` }
  }

  async put(
    key: string,
    body: Buffer | Uint8Array,
    _contentType: string
  ): Promise<void> {
    const filePath = join(this.basePath, key)
    await fs.mkdir(dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, body)
  }

  async putStream(
    key: string,
    body: Readable,
    _contentType: string
  ): Promise<number> {
    const filePath = join(this.basePath, key)
    await fs.mkdir(dirname(filePath), { recursive: true })

    let bytes = 0
    body.on('data', (chunk: Buffer) => {
      bytes += chunk.length
    })

    try {
      await pipeline(body, createWriteStream(filePath))
    } catch (err) {
      // Don't leave a truncated blob behind on a failed or aborted upload
      await fs.unlink(filePath).catch(() => {})
      throw err
    }

    return bytes
  }

  async createFolder(key: string): Promise<void> {
    const dir = join(this.basePath, key)
    await fs.mkdir(dir, { recursive: true })
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.basePath, key)
    try {
      await fs.unlink(filePath)
    } catch {
      // Ignore if already deleted
    }
  }

  async deletePrefix(prefix: string): Promise<number> {
    const dir = join(this.basePath, prefix)
    let deleted = 0

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true })
      await fs.rm(dir, { recursive: true, force: true })
      deleted = entries.filter(e => !e.isDirectory()).length
    } catch {
      // Directory may not exist
    }

    return deleted
  }

  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    const src = join(this.basePath, sourceKey)
    const dest = join(this.basePath, destinationKey)
    await fs.mkdir(dirname(dest), { recursive: true })
    await fs.copyFile(src, dest)
  }
}
