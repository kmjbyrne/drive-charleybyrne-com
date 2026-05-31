import { container } from '../../../../../app/container'
import { requireAuth } from '../../../../../app/auth'
import { requireAccess } from '../../../../../app/guards'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  const subjectId = getRouterParam(event, 'subjectId')

  if (!id || !subjectId) {
    throw createError({ statusCode: 400, message: 'File ID and subject ID are required' })
  }

  const entry = await container.catalogRepo.getEntry(id)
  if (!entry) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  const objectType = entry.type === 'folder' ? 'folder' as const : 'file' as const
  await requireAccess(user, id, objectType, 'admin', entry.ownerId)

  await container.permissionService.revoke(id, subjectId)
  setResponseStatus(event, 204)
  return null
})
