import { S3Client } from '@aws-sdk/client-s3'
import { resolve } from 'node:path'
import { S3StorageRepository } from './repositories/storage.repository'
import { LocalStorageRepository } from './repositories/local-storage.repository'
import { SqliteCatalogRepository } from './repositories/sqlite-catalog.repository'
import { SqlitePermissionRepository } from './repositories/sqlite-permission.repository'
import { SqliteUserRepository } from './repositories/sqlite-user.repository'
import { SqliteShareInviteRepository } from './repositories/sqlite-share-invite.repository'
import { SqliteActivityRepository } from './repositories/sqlite-activity.repository'
import { StorageService } from '../core/services/storage.service'
import { PermissionService } from '../core/services/permission.service'
import { ActivityService } from '../core/services/activity.service'
import { useDatabase } from '../database'
import type { IStorageRepository } from '../core/ports/repositories/storage.repository.port'

function buildStorageRepo(config: ReturnType<typeof useRuntimeConfig>): IStorageRepository {
  const driver = (config.storage.driver as string) || 'local'

  if (driver === 'local') {
    const blobPath = resolve(process.cwd(), 'data', 'blobs')
    console.info(`[storage] Using local filesystem at ${blobPath}`)
    return new LocalStorageRepository(blobPath)
  }

  if (driver !== 's3') {
    throw new Error(`[storage] Unknown storage driver: "${driver}". Expected "local" or "s3".`)
  }

  const bucket = config.s3.bucket as string
  if (!bucket) {
    throw new Error('[storage] Storage driver is "s3" but NUXT_S3_BUCKET is not set.')
  }

  const region = config.s3.region as string || 'eu-west-1'

  const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
    region
  }

  // Custom endpoint for S3-compatible services (MinIO, R2, B2)
  const endpoint = config.s3.endpoint as string
  if (endpoint) {
    clientConfig.endpoint = endpoint
    clientConfig.forcePathStyle = true
  }

  // Explicit credentials when not using IAM roles
  const accessKeyId = config.s3.accessKeyId as string
  const secretAccessKey = config.s3.secretAccessKey as string
  if (accessKeyId && secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId,
      secretAccessKey
    }
  }

  const s3Client = new S3Client(clientConfig)
  return new S3StorageRepository(s3Client, bucket)
}

function buildContainer() {
  const config = useRuntimeConfig()
  const storageRepo = buildStorageRepo(config)

  const db = useDatabase()
  const catalogRepo = new SqliteCatalogRepository(db)
  const permissionRepo = new SqlitePermissionRepository(db)
  const userRepo = new SqliteUserRepository(db)
  const shareInviteRepo = new SqliteShareInviteRepository(db)
  const activityRepo = new SqliteActivityRepository(db)
  const activityService = new ActivityService(activityRepo)

  return {
    storageService: new StorageService(storageRepo, catalogRepo, activityService),
    permissionService: new PermissionService(permissionRepo, catalogRepo, activityService),
    activityService,
    catalogRepo,
    userRepo,
    shareInviteRepo
  }
}

let _container: ReturnType<typeof buildContainer> | null = null

export const container = new Proxy({} as ReturnType<typeof buildContainer>, {
  get(_target, prop) {
    if (!_container) _container = buildContainer()
    return _container[prop as keyof ReturnType<typeof buildContainer>]
  }
})
