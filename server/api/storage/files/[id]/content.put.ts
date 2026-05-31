import { container } from '../../../../app/container'
import { requireAuth } from '../../../../app/auth'
import { requireAccess } from '../../../../app/guards'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'File ID is required' })
  }

  const body = await readBody<{ content: string }>(event)
  if (typeof body?.content !== 'string') {
    throw createError({ statusCode: 400, message: 'content string is required' })
  }

  const entry = await container.catalogRepo.getEntry(id)
  if (!entry) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  await requireAccess(user, id, 'file', 'editor', entry.ownerId)

  if (!entry.blobKey) {
    throw createError({ statusCode: 400, message: 'File has no blob' })
  }

  await container.storageService.updateContent(
    entry.blobKey,
    body.content,
    entry.mimeType || 'text/markdown'
  )

  await container.catalogRepo.updateEntry(id, {
    modifiedAt: new Date()
  })

  return { ok: true }
})
