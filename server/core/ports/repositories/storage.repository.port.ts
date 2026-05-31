import type {
  ListResult,
  ObjectInfo,
  PresignedUpload,
  PresignedDownload
} from '../../domain/storage'

export interface IStorageRepository {
  /**
   * List objects and common prefixes under the given prefix.
   * Uses delimiter '/' to simulate folder browsing.
   */
  list(
    prefix: string,
    continuationToken?: string,
    maxKeys?: number
  ): Promise<ListResult>

  /**
   * Get metadata for a single object without downloading its body.
   */
  head(key: string): Promise<ObjectInfo | null>

  /**
   * Generate a presigned PUT URL for direct browser upload.
   */
  presignUpload(
    key: string,
    contentType: string,
    maxBytes: number,
    expirySeconds?: number
  ): Promise<PresignedUpload>

  /**
   * Generate a presigned GET URL for direct browser download.
   */
  presignDownload(
    key: string,
    expirySeconds?: number
  ): Promise<PresignedDownload>

  /**
   * Upload a file body directly to the storage backend.
   */
  put(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string
  ): Promise<void>

  /**
   * Create a zero-byte marker object to represent an empty folder.
   */
  createFolder(key: string): Promise<void>

  /**
   * Delete a single object by key.
   */
  delete(key: string): Promise<void>

  /**
   * Delete all objects under the given prefix.
   * Returns the number of objects deleted.
   */
  deletePrefix(prefix: string): Promise<number>

  /**
   * Copy an object from one key to another within the same bucket.
   */
  copy(sourceKey: string, destinationKey: string): Promise<void>
}
