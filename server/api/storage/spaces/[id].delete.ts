import { container } from '../../../app/container'
import { requireAuth } from '../../../app/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Space ID is required' })
  }

  const space = await container.catalogRepo.getSpace(id)
  if (!space) {
    throw createError({ statusCode: 404, message: 'Space not found' })
  }

  if (space.ownerId !== user.sub) {
    throw createError({ statusCode: 403, message: 'Not authorised to delete this space' })
  }

  // Soft-delete all entries in this space before removing the space itself
  await container.catalogRepo.trashBySpace(id)
  await container.catalogRepo.deleteSpace(id)
  setResponseStatus(event, 204)
  return null
})
