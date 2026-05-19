export interface StorageObject {
  key: string
  size: number
  lastModified: Date
  etag: string
  contentType: string
}

export interface StoragePrefix {
  prefix: string
}

export interface ListResult {
  objects: StorageObject[]
  prefixes: StoragePrefix[]
  isTruncated: boolean
  continuationToken?: string
}

export interface ObjectInfo {
  key: string
  size: number
  lastModified: Date
  etag: string
  contentType: string
}

export interface PresignedUpload {
  url: string
  key: string
}

export interface PresignedDownload {
  url: string
}
