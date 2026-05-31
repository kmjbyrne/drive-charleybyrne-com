import { z } from 'zod'
import { container } from '../../../../app/container'
import { requireAuth } from '../../../../app/auth'

const bodySchema = z.object({
  tagId: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const fileId = getRouterParam(event, 'id')
  if (!fileId) {
    throw createError({ statusCode: 400, message: 'File ID is required' })
  }

  const body = await readValidatedBody(event, bodySchema.parse)
  await container.catalogRepo.tagFile({ fileId, tagId: body.tagId })

  setResponseStatus(event, 201)
  return { ok: true }
})
