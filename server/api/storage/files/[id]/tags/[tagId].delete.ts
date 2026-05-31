import { container } from '../../../../../app/container'
import { requireAuth } from '../../../../../app/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const fileId = getRouterParam(event, 'id')
  const tagId = getRouterParam(event, 'tagId')

  if (!fileId || !tagId) {
    throw createError({ statusCode: 400, message: 'File ID and Tag ID are required' })
  }

  await container.catalogRepo.untagFile({ fileId, tagId })
  setResponseStatus(event, 204)
  return null
})
