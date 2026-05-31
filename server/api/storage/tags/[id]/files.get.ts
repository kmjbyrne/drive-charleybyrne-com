import { container } from '../../../../app/container'
import { requireAuth } from '../../../../app/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const tagId = getRouterParam(event, 'id')
  if (!tagId) {
    throw createError({ statusCode: 400, message: 'Tag ID is required' })
  }

  return container.catalogRepo.listFilesByTag(tagId, user.sub)
})
