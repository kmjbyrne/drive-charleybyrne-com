import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import { container } from '../../../../app/container'
import { requireAuth } from '../../../../app/auth'
import { requireAccess } from '../../../../app/guards'

const bodySchema = z.object({
  title: z.string().nullable().optional(),
  artist: z.string().nullable().optional(),
  album: z.string().nullable().optional(),
  year: z.number().int().nullable().optional(),
  trackNumber: z.number().int().nullable().optional(),
  genre: z.string().nullable().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'File ID is required' })
  }

  const entry = await container.catalogRepo.getEntry(id)
  if (!entry) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  await requireAccess(user, id, 'file', 'editor', entry.ownerId)

  const ext = entry.ext?.toLowerCase()
  if (ext !== '.mp3') {
    throw createError({ statusCode: 400, message: 'Metadata writing is currently only supported for MP3 files' })
  }

  if (!entry.blobKey) {
    throw createError({ statusCode: 404, message: 'No blob key' })
  }

  const config = useRuntimeConfig()
  const driver = (config.storage?.driver as string) || 'local'

  if (driver !== 'local') {
    throw createError({ statusCode: 501, message: 'Metadata writing is only supported for local storage' })
  }

  const blobPath = resolve(process.cwd(), 'data', 'blobs', entry.blobKey)

  try {
    await fs.stat(blobPath)
  } catch {
    throw createError({ statusCode: 404, message: 'Blob not found on disk' })
  }

  const body = await readValidatedBody(event, bodySchema.parse)

  const NodeID3 = await import('node-id3')

  // Read existing tags to preserve what we're not changing
  const existing = NodeID3.default.read(blobPath)

  const tags: Record<string, unknown> = { ...existing }
  if (body.title !== undefined) tags.title = body.title || ''
  if (body.artist !== undefined) tags.artist = body.artist || ''
  if (body.album !== undefined) tags.album = body.album || ''
  if (body.year !== undefined) tags.year = body.year ? String(body.year) : ''
  if (body.trackNumber !== undefined) tags.trackNumber = body.trackNumber ? String(body.trackNumber) : ''
  if (body.genre !== undefined) tags.genre = body.genre || ''

  const success = NodeID3.default.update(tags, blobPath)
  if (!success) {
    throw createError({ statusCode: 500, message: 'Failed to write ID3 tags' })
  }

  // Update the catalog entry's modifiedAt
  await container.catalogRepo.updateEntry(id, { modifiedAt: new Date() })

  // Emit activity
  await container.activityService.record({
    actorId: user.sub,
    action: 'file.renamed',
    objectId: id,
    objectType: 'file',
    objectName: entry.name
  })

  return { ok: true }
})
