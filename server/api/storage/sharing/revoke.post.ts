import { z } from 'zod'
import { container } from '../../../app/container'
import { requireAuth } from '../../../app/auth'

const bodySchema = z.object({
  objectId: z.string().min(1),
  // Either a user ID (for granted permissions) or an email (for pending invites)
  subjectId: z.string().optional(),
  email: z.string().email().optional()
}).refine(d => d.subjectId || d.email, {
  message: 'Either subjectId or email is required'
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, bodySchema.parse)

  // Look up the object to get the owner
  let ownerId: string | undefined
  const space = await container.catalogRepo.getSpace(body.objectId)
  if (space) {
    ownerId = space.ownerId
  } else {
    const entry = await container.catalogRepo.getEntry(body.objectId)
    if (!entry) throw createError({ statusCode: 404, message: 'Object not found' })
    ownerId = entry.ownerId
  }

  // Only the owner or an admin can revoke access
  const objectType = space ? 'space' as const : 'file' as const
  const allowed = await container.permissionService.canAccess(
    body.objectId, objectType, user.sub, 'admin', ownerId
  )
  if (!allowed) {
    throw createError({ statusCode: 403, message: 'Only owners and admins can revoke access' })
  }

  if (body.subjectId) {
    await container.permissionService.revoke(body.objectId, body.subjectId)
  }
  if (body.email) {
    await container.shareInviteRepo.deleteByObjectAndEmail(body.objectId, body.email)
  }

  return { ok: true }
})
