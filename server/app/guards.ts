import type { ObjectType, PermissionRole } from '../core/domain/permission'
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
  if (!allowed) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
}
