import { container } from '../../app/container'
import { requireAuth } from '../../app/auth'
import { requireAccess } from '../../app/guards'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const query = getQuery(event)
  const spaceId = query.spaceId as string
  const parentId = (query.parentId as string) || null

  if (!spaceId) {
    throw createError({ statusCode: 400, message: 'spaceId is required' })
  }

  const space = await container.catalogRepo.getSpace(spaceId)
  if (!space) {
    throw createError({ statusCode: 404, message: 'Space not found' })
  }

  await requireAccess(user, spaceId, 'space', 'viewer', space.ownerId)

  const entries = await container.catalogRepo.listChildren(parentId, spaceId)
  return entries
})
