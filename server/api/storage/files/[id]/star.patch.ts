import { z } from 'zod'
import { container } from '../../../../app/container'
import { requireAuth } from '../../../../app/auth'

const bodySchema = z.object({
  starred: z.boolean()
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'File ID is required' })
  }

  const body = await readValidatedBody(event, bodySchema.parse)
  const updated = await container.catalogRepo.updateEntry(id, { starred: body.starred })
  if (!updated) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  return updated
})
