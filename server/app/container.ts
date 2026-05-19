import { S3Client } from '@aws-sdk/client-s3'
import { S3StorageRepository } from './repositories/storage.repository'
import { StorageService } from '../core/services/storage.service'

function buildContainer() {
  const config = useRuntimeConfig()

  const bucket = config.s3.bucket as string
  if (!bucket) {
    throw new Error('S3_BUCKET (NUXT_S3_BUCKET) environment variable is required')
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
  const storageRepo = new S3StorageRepository(s3Client, bucket)

  return {
    storageService: new StorageService(storageRepo)
  }
}

let _container: ReturnType<typeof buildContainer> | null = null

export const container = new Proxy({} as ReturnType<typeof buildContainer>, {
  get(_target, prop) {
    if (!_container) _container = buildContainer()
    return _container[prop as keyof ReturnType<typeof buildContainer>]
  }
})
