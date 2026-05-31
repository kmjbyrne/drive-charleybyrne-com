import { z } from 'zod'
import { container } from '../../../../app/container'
import { requireAuth } from '../../../../app/auth'
import { requireAccess } from '../../../../app/guards'

const bodySchema = z.object({
  email: z.string().email(),
  role: z.enum(['viewer', 'editor'])
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

  const objectType = entry.type === 'folder' ? 'folder' as const : 'file' as const
  await requireAccess(user, id, objectType, 'admin', entry.ownerId)

  const body = await readValidatedBody(event, bodySchema.parse)

  // Look up the target user by email within the same tenant
  const matches = await container.userRepo.findByEmail(body.email, user.tid)
  const target = matches.find(u => u.email === body.email)
  if (!target) {
    throw createError({ statusCode: 404, message: 'No user found with that email address' })
  }

  if (target.id === user.sub) {
    throw createError({ statusCode: 400, message: 'You cannot share with yourself' })
  }

  const permission = await container.permissionService.grant({
    objectId: id,
    objectType,
    subjectId: target.id,
    role: body.role,
    grantedBy: user.sub
  })

  return {
    id: permission.id,
    role: permission.role,
    createdAt: permission.createdAt,
    user: {
      id: target.id,
      email: target.email,
      firstName: target.firstName,
      lastName: target.lastName,
      avatar: target.avatar
    }
  }
})
