import { container } from '../../app/container'
import { requireAuth } from '../../app/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Get all space-level permissions granted to this user
  const spacePermissions = await container.permissionService.listAccessibleSpaces(user.sub)

  // Fetch the actual space objects, excluding spaces the user owns
  const sharedSpaces = []
  for (const perm of spacePermissions) {
    const space = await container.catalogRepo.getSpace(perm.objectId)
    if (space && space.ownerId !== user.sub) {
      sharedSpaces.push({
        space,
        role: perm.role,
        grantedBy: perm.grantedBy
      })
    }
  }

  // Enrich grantedBy with user details
  const granterIds = [...new Set(sharedSpaces.map(s => s.grantedBy))]
  const granters = await container.userRepo.getByIds(granterIds)
  const granterMap = new Map(granters.map(u => [u.id, {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    avatar: u.avatar
  }]))

  return {
    spaces: sharedSpaces.map(s => ({
      space: s.space,
      role: s.role,
      sharedBy: granterMap.get(s.grantedBy) || null
    }))
  }
})
