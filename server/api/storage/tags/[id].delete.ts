import { container } from '../../../app/container'
import { requireAuth } from '../../../app/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Tag ID is required' })
  }

  await container.catalogRepo.deleteTag(id, user.sub)
  setResponseStatus(event, 204)
  return null
})
