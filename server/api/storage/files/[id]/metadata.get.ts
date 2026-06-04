import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'
import { container } from '../../../../app/container'
import { requireAuth } from '../../../../app/auth'
import { requireAccess } from '../../../../app/guards'

const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'])

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

  await requireAccess(user, id, 'file', 'viewer', entry.ownerId)

  const ext = entry.ext?.toLowerCase()
  if (!ext || !AUDIO_EXTS.has(ext)) {
    throw createError({ statusCode: 400, message: 'Not an audio file' })
  }

  if (!entry.blobKey) {
    throw createError({ statusCode: 404, message: 'No blob key' })
  }

  const config = useRuntimeConfig()
  const driver = (config.storage?.driver as string) || 'local'

  if (driver !== 'local') {
    throw createError({ statusCode: 501, message: 'Metadata reading is only supported for local storage' })
  }

  const blobPath = resolve(process.cwd(), 'data', 'blobs', entry.blobKey)

  let stat: Awaited<ReturnType<typeof fs.stat>>
  try {
    stat = await fs.stat(blobPath)
  } catch {
    throw createError({ statusCode: 404, message: 'Blob not found on disk' })
  }

  const { parseFile } = await import('music-metadata')
  const metadata = await parseFile(blobPath)
  const { common, format } = metadata

  // Extract album art as base64 data URL
  let albumArt: string | null = null
  if (common.picture && common.picture.length > 0) {
    const pic = common.picture[0]!
    const b64 = Buffer.from(pic.data).toString('base64')
    albumArt = `data:${pic.format};base64,${b64}`
  }

  return {
    title: common.title || null,
    artist: common.artist || null,
    album: common.album || null,
    year: common.year || null,
    trackNumber: common.track?.no || null,
    trackTotal: common.track?.of || null,
    genre: common.genre?.[0] || null,
    albumArt,
    duration: format.duration || null,
    bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : null,
    sampleRate: format.sampleRate || null,
    codec: format.codec || null,
    fileSize: stat.size
  }
})
