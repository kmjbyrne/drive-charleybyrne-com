import { container } from '../../../app/container'
import { requireAuth } from '../../../app/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const query = getQuery(event)
  const objectId = query.objectId as string

  if (!objectId) {
    throw createError({ statusCode: 400, message: 'objectId is required' })
  }

  const permissions = await container.permissionService.listCollaborators(objectId)

  // Enrich with user details
  const subjectIds = permissions.map(p => p.subjectId)
  const users = await container.userRepo.getByIds(subjectIds)
  const userMap = new Map(users.map(u => [u.id, u]))

  // Also get the owner info
  let ownerId: string | null = null
  const space = await container.catalogRepo.getSpace(objectId)
  if (space) {
    ownerId = space.ownerId
  } else {
    const entry = await container.catalogRepo.getEntry(objectId)
    if (entry) ownerId = entry.ownerId
  }

  const collaborators: Array<{
    id: string
    email: string | null
    firstName: string | null
    lastName: string | null
    avatar: string | null
    role: string
    grantedBy: string
    createdAt: Date
    pending?: boolean
  }> = permissions.map((p) => {
    const u = userMap.get(p.subjectId)
    return {
      id: p.subjectId,
      email: u?.email || null,
      firstName: u?.firstName || null,
      lastName: u?.lastName || null,
      avatar: u?.avatar || null,
      role: p.role,
      grantedBy: p.grantedBy,
      createdAt: p.createdAt
    }
  })

  // Include the owner at the top if they're not already in the list
  if (ownerId && !permissions.some(p => p.subjectId === ownerId)) {
    const owner = await container.userRepo.getById(ownerId)
    collaborators.unshift({
      id: ownerId,
      email: owner?.email || null,
      firstName: owner?.firstName || null,
      lastName: owner?.lastName || null,
      avatar: owner?.avatar || null,
      role: 'owner' as string,
      grantedBy: ownerId,
      createdAt: new Date()
    })
  }

  // Include pending invites
  const invites = await container.shareInviteRepo.listByObject(objectId)
  for (const invite of invites) {
    collaborators.push({
      id: invite.id,
      email: invite.email,
      firstName: null,
      lastName: null,
      avatar: null,
      role: invite.role,
      grantedBy: invite.grantedBy,
      createdAt: invite.createdAt,
      pending: true
    })
  }

  return collaborators
})
