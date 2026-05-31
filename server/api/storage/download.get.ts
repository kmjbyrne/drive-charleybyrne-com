import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'
import { requireAuth } from '../../app/auth'
import { requireAccess } from '../../app/guards'
import { container } from '../../app/container'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const query = getQuery(event)
  const key = query.key as string | undefined
  if (!key) {
    throw createError({ statusCode: 400, message: 'key query parameter is required' })
  }

  // Look up which file entry owns this blob key and check permissions
  const entry = await container.catalogRepo.getEntryByBlobKey(key)
  if (entry) {
    const objectType = entry.type === 'folder' ? 'folder' as const : 'file' as const
    await requireAccess(user, entry.id, objectType, 'viewer', entry.ownerId)
  }

  const config = useRuntimeConfig()
  const driver = (config.storage?.driver as string) || 'local'

  if (driver === 's3') {
    // S3 mode: redirect to a presigned download URL
    const userId = 'unused'
    const result = await container.storageService.presignDownload(userId, key)
    return sendRedirect(event, result.url)
  }

  // Local mode: stream the file from disk
  const blobPath = resolve(process.cwd(), 'data', 'blobs', key)

  let stat: Awaited<ReturnType<typeof fs.stat>>
  try {
    stat = await fs.stat(blobPath)
  } catch {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  const { lookup } = await import('mime-types')
  const contentType = lookup(key) || 'application/octet-stream'

  setResponseHeader(event, 'Content-Type', contentType)
  setResponseHeader(event, 'Content-Length', stat.size)

  const data = await fs.readFile(blobPath)
  return data
})
