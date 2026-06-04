import { z } from 'zod'
import { container } from '../../app/container'
import { requireAuth } from '../../app/auth'

const bodySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().default('i-lucide-folder'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, bodySchema.parse)

  const space = await container.catalogRepo.createSpace({
    id: crypto.randomUUID(),
    name: body.name,
    icon: body.icon,
    color: body.color,
    ownerId: user.sub,
    createdAt: new Date()
  })

  await container.activityService.record({
    actorId: user.sub,
    action: 'space.created',
    objectId: space.id,
    objectType: 'space',
    objectName: space.name
  })

  setResponseStatus(event, 201)
  return space
})
