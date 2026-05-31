import { z } from 'zod'
import { container } from '../../app/container'
import { requireAuth } from '../../app/auth'
import { requireAccess } from '../../app/guards'

const bodySchema = z.object({
  name: z.string().min(1).max(255),
  spaceId: z.string().min(1),
  parentId: z.string().nullable().default(null)
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, bodySchema.parse)

  const space = await container.catalogRepo.getSpace(body.spaceId)
  if (!space) throw createError({ statusCode: 404, message: 'Space not found' })
  await requireAccess(user, body.spaceId, 'space', 'editor', space.ownerId)

  const entry = await container.catalogRepo.createEntry({
    id: crypto.randomUUID(),
    parentId: body.parentId,
    spaceId: body.spaceId,
    name: body.name,
    type: 'folder',
    mimeType: null,
    ext: null,
    sizeBytes: 0,
    blobKey: null,
    ownerId: user.sub,
    starred: false,
    trashedAt: null,
    createdAt: new Date(),
    modifiedAt: new Date()
  })

  setResponseStatus(event, 201)
  return entry
})
