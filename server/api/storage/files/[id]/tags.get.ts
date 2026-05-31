import { container } from '../../../../app/container'
import { requireAuth } from '../../../../app/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const fileId = getRouterParam(event, 'id')
  if (!fileId) {
    throw createError({ statusCode: 400, message: 'File ID is required' })
  }

  return container.catalogRepo.getFileTags(fileId)
})
