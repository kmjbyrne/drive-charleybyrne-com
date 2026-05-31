import { z } from 'zod'
import { container } from '../../app/container'
import { requireAuth } from '../../app/auth'

const bodySchema = z.object({
  label: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, bodySchema.parse)

  const tag = await container.catalogRepo.createTag({
    id: crypto.randomUUID(),
    label: body.label,
    color: body.color,
    ownerId: user.sub
  })

  setResponseStatus(event, 201)
  return tag
})
