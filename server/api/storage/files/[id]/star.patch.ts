import { z } from 'zod'
import { container } from '../../../../app/container'
import { requireAuth } from '../../../../app/auth'

const bodySchema = z.object({
  starred: z.boolean()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'File ID is required' })
  }

  const body = await readValidatedBody(event, bodySchema.parse)
  const updated = await container.catalogRepo.updateEntry(id, { starred: body.starred })
  if (!updated) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  await container.activityService.record({
    actorId: user.sub,
    action: body.starred ? 'file.starred' : 'file.unstarred',
    objectId: id,
    objectType: updated.type === 'folder' ? 'folder' : 'file',
    objectName: updated.name
  })

  return updated
})
