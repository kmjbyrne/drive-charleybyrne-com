import { z } from 'zod'
import { container } from '../../../../app/container'
import { requireAuth } from '../../../../app/auth'
import { requireAccess } from '../../../../app/guards'

const bodySchema = z.object({
  name: z.string().min(1).max(255)
})

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
  await requireAccess(user, id, entry.type === 'folder' ? 'folder' : 'file', 'editor', entry.ownerId)

  const body = await readValidatedBody(event, bodySchema.parse)
  const oldName = entry.name
  const updated = await container.catalogRepo.updateEntry(id, {
    name: body.name,
    modifiedAt: new Date()
  })
  if (!updated) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  await container.activityService.record({
    actorId: user.sub,
    action: 'file.renamed',
    objectId: id,
    objectType: entry.type === 'folder' ? 'folder' : 'file',
    objectName: oldName
  })

  return updated
})
