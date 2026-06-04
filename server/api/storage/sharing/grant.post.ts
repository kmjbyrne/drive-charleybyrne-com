import { z } from 'zod'
import { container } from '../../../app/container'
import { requireAuth } from '../../../app/auth'

const bodySchema = z.object({
  objectId: z.string().min(1),
  objectType: z.enum(['file', 'folder', 'space']),
  email: z.string().email(),
  role: z.enum(['viewer', 'editor', 'admin'])
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readValidatedBody(event, bodySchema.parse)
  const email = body.email.toLowerCase()

  // Look up the object to verify it exists and get its owner
  let ownerId: string | undefined
  if (body.objectType === 'space') {
    const space = await container.catalogRepo.getSpace(body.objectId)
    if (!space) throw createError({ statusCode: 404, message: 'Space not found' })
    ownerId = space.ownerId
  } else {
    const entry = await container.catalogRepo.getEntry(body.objectId)
    if (!entry) throw createError({ statusCode: 404, message: 'Entry not found' })
    ownerId = entry.ownerId
  }

  // Only the owner or someone with admin role can grant access
  const allowed = await container.permissionService.canAccess(
    body.objectId, body.objectType, user.sub, 'admin', ownerId
  )
  if (!allowed) {
    throw createError({ statusCode: 403, message: 'Only owners and admins can share' })
  }

  // Cannot share with yourself
  if (email === user.email?.toLowerCase()) {
    throw createError({ statusCode: 400, message: 'Cannot share with yourself' })
  }

  // Try to find the user by email
  const targetUser = await container.userRepo.findByExactEmail(email)

  if (targetUser) {
    // User exists — grant permission directly
    const permission = await container.permissionService.grant({
      objectId: body.objectId,
      objectType: body.objectType,
      subjectId: targetUser.id,
      role: body.role,
      grantedBy: user.sub
    })
    return { type: 'granted', permission }
  }

  // User doesn't exist — create a pending invite
  const invite = await container.shareInviteRepo.create({
    id: crypto.randomUUID(),
    objectId: body.objectId,
    objectType: body.objectType,
    email,
    role: body.role,
    grantedBy: user.sub,
    createdAt: new Date()
  })

  // Resolve the object name for the activity snapshot
  let objectName = body.objectId
  if (body.objectType === 'space') {
    const space = await container.catalogRepo.getSpace(body.objectId)
    if (space) objectName = space.name
  } else {
    const entry = await container.catalogRepo.getEntry(body.objectId)
    if (entry) objectName = entry.name
  }

  await container.activityService.record({
    actorId: user.sub,
    action: 'share.invited',
    objectId: body.objectId,
    objectType: body.objectType,
    objectName
  })

  return { type: 'invited', invite }
})
