import type { ObjectType, PermissionRole } from '../core/domain/permission'
import { ROLE_RANK } from '../core/domain/permission'
import type { JanusUser } from './auth'
import { container } from './container'

export async function requireAccess(
  user: JanusUser,
  objectId: string,
  objectType: ObjectType,
  requiredRole: PermissionRole,
  ownerId: string
): Promise<void> {
  const allowed = await container.permissionService.canAccess(
    objectId, objectType, user.sub, requiredRole, ownerId
  )
  if (allowed) return

  // Check for a pending invite that covers this object and auto-convert it
  if (user.email) {
    const invites = await container.shareInviteRepo.listByEmail(user.email.toLowerCase())
    const match = invites.find(
      (i) => i.objectId === objectId && ROLE_RANK[i.role] >= ROLE_RANK[requiredRole]
    )
    if (match) {
      await container.permissionService.grant({
        objectId: match.objectId,
        objectType: match.objectType,
        subjectId: user.sub,
        role: match.role,
        grantedBy: match.grantedBy
      })
      await container.shareInviteRepo.delete(match.id)
      return
    }
  }

  throw createError({ statusCode: 403, message: 'Forbidden' })
}
