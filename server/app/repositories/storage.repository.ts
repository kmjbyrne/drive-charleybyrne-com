import {
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  ListObjectsV2Command, GetObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Upload } from '@aws-sdk/lib-storage'
import type { S3Client } from '@aws-sdk/client-s3'
import type { Readable } from 'node:stream'
import type { IStorageRepository } from '../../core/ports/repositories/storage.repository.port'
import type {
  ListResult,
  ObjectInfo,
  PresignedUpload,
  PresignedDownload,
  StorageObject,
  StoragePrefix
} from '../../core/domain/storage'

export class S3StorageRepository implements IStorageRepository {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string
  ) {}

  async list(
    prefix: string,
    continuationToken?: string,
    maxKeys: number = 1000
  ): Promise<ListResult> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      Delimiter: '/',
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken
    })

    const response = await this.client.send(command)

    const objects: StorageObject[] = (response.Contents ?? [])
      // Filter out the prefix itself (folder marker at this level)
      .filter(obj => obj.Key !== prefix)
      .map(obj => ({
        key: obj.Key!,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified ?? new Date(),
        etag: obj.ETag ?? '',
        contentType: ''
      }))

    const prefixes: StoragePrefix[] = (response.CommonPrefixes ?? []).map(cp => ({
      prefix: cp.Prefix!
    }))

    return {
      objects,
      prefixes,
      isTruncated: response.IsTruncated ?? false,
      continuationToken: response.NextContinuationToken
    }
  }

  async head(key: string): Promise<ObjectInfo | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      })
      const response = await this.client.send(command)

      return {
        key,
        size: response.ContentLength ?? 0,
        lastModified: response.LastModified ?? new Date(),
        etag: response.ETag ?? '',
        contentType: response.ContentType ?? 'application/octet-stream'
      }
    } catch (error: unknown) {
      if (this.isNotFound(error)) return null
      throw error
    }
  }

  async presignUpload(
    key: string,
    contentType: string,
    _maxBytes: number,
    expirySeconds: number = 900
  ): Promise<PresignedUpload> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType
    })

    const url = await getSignedUrl(this.client, command, {
      expiresIn: expirySeconds
    })

    return { url, key }
  }

  async presignDownload(
    key: string,
    expirySeconds: number = 300
  ): Promise<PresignedDownload> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    })

    const url = await getSignedUrl(this.client, command, {
      expiresIn: expirySeconds
    })

    return { url }
  }

  async put(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType
    })
    await this.client.send(command)
  }

  async putStream(
    key: string,
    body: Readable,
    contentType: string
  ): Promise<number> {
    let bytes = 0
    body.on('data', (chunk: Buffer) => {
      bytes += chunk.length
    })

    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      },
      queueSize: 4,
      partSize: 8 * 1024 * 1024
    })

    await upload.done()
    return bytes
  }

  async createFolder(key: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentLength: 0,
      Body: ''
    })
    await this.client.send(command)
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key
    })
    await this.client.send(command)
  }

  async deletePrefix(prefix: string): Promise<number> {
    let deleted = 0
    let continuationToken: string | undefined

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken
      })
      const listResponse = await this.client.send(listCommand)

      const keys = (listResponse.Contents ?? [])
        .map(obj => obj.Key!)
        .filter(Boolean)

      if (keys.length === 0) break

      // DeleteObjects accepts up to 1000 keys per call
      const command = new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: keys.map(Key => ({ Key })),
          Quiet: true
        }
      })
      await this.client.send(command)

      deleted += keys.length
      continuationToken = listResponse.NextContinuationToken
    }
    while (continuationToken)

    return deleted
  }

  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    const command = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${sourceKey}`,
      Key: destinationKey
    })
    await this.client.send(command)
  }

  private isNotFound(error: unknown): boolean {
    return (
      typeof error === 'object'
      && error !== null
      && 'name' in error
      && (error as { name: string }).name === 'NotFound'
    )
  }
}
