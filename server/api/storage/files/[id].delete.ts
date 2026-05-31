import { container } from '../../../app/container'
import { requireAuth } from '../../../app/auth'
import { requireAccess } from '../../../app/guards'

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

  const objectType = entry.type === 'folder' ? 'folder' as const : 'file' as const
  await requireAccess(user, id, objectType, 'admin', entry.ownerId)

  // Soft-delete: move to trash instead of permanently deleting
  await container.catalogRepo.trashEntry(id)
  return { ok: true }
})
