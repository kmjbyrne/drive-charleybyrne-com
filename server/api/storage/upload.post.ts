import { container } from '../../app/container'
import { requireAuth } from '../../app/auth'
import { requireAccess } from '../../app/guards'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No file provided' })
  }

  const filePart = formData.find(p => p.name === 'file')
  const spaceIdPart = formData.find(p => p.name === 'spaceId')
  const parentIdPart = formData.find(p => p.name === 'parentId')

  if (!filePart?.data || !filePart.filename) {
    throw createError({ statusCode: 400, message: 'Missing file in form data' })
  }

  if (!spaceIdPart?.data) {
    throw createError({ statusCode: 400, message: 'spaceId is required' })
  }

  const spaceId = spaceIdPart.data.toString('utf-8')
  const parentId = parentIdPart?.data?.toString('utf-8') || null

  const space = await container.catalogRepo.getSpace(spaceId)
  if (!space) throw createError({ statusCode: 404, message: 'Space not found' })
  await requireAccess(user, spaceId, 'space', 'editor', space.ownerId)

  const entry = await container.storageService.upload({
    userId: user.sub,
    spaceId,
    parentId,
    fileName: filePart.filename,
    contentType: filePart.type || 'application/octet-stream',
    body: filePart.data
  })

  return entry
})
