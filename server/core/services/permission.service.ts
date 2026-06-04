import type { IPermissionRepository } from '../ports/repositories/permission.repository.port'
import type { ICatalogRepository } from '../ports/repositories/catalog.repository.port'
import type {
  ObjectPermission,
  EffectivePermission,
  ObjectType,
  PermissionRole
} from '../domain/permission'
import { ROLE_RANK } from '../domain/permission'
import type { ActivityService } from './activity.service'

export class PermissionService {
  constructor(
    private readonly permissions: IPermissionRepository,
    private readonly catalog: ICatalogRepository,
    private readonly activity?: ActivityService
  ) {}

  async grant(params: {
    objectId: string
    objectType: ObjectType
    subjectId: string
    role: PermissionRole
    grantedBy: string
  }): Promise<ObjectPermission> {
    const permission: ObjectPermission = {
      id: crypto.randomUUID(),
      objectId: params.objectId,
      objectType: params.objectType,
      subjectId: params.subjectId,
      role: params.role,
      grantedBy: params.grantedBy,
      createdAt: new Date()
    }
    const result = await this.permissions.grant(permission)

    if (this.activity) {
      // Resolve object name for the activity snapshot
      const objectName = await this.resolveObjectName(params.objectId, params.objectType)
      await this.activity.record({
        actorId: params.grantedBy,
        action: 'share.granted',
        objectId: params.objectId,
        objectType: params.objectType,
        objectName,
        targetUserId: params.subjectId
      })
    }

    return result
  }

  async revoke(objectId: string, subjectId: string): Promise<void> {
    // Look up the permission before deleting so we have the objectType
    const existing = await this.permissions.getPermission(objectId, subjectId)
    await this.permissions.revoke(objectId, subjectId)

    if (this.activity && existing) {
      const objectName = await this.resolveObjectName(objectId, existing.objectType)
      await this.activity.record({
        actorId: existing.grantedBy,
        action: 'share.revoked',
        objectId,
        objectType: existing.objectType,
        objectName,
        targetUserId: subjectId
      })
    }
  }

  async listCollaborators(objectId: string): Promise<ObjectPermission[]> {
    return this.permissions.listByObject(objectId)
  }

  async listSharedByMe(grantedBy: string): Promise<ObjectPermission[]> {
    return this.permissions.listByGranter(grantedBy)
  }

  async listBySubject(subjectId: string): Promise<ObjectPermission[]> {
    return this.permissions.listBySubject(subjectId)
  }

  async listAccessibleSpaces(subjectId: string): Promise<ObjectPermission[]> {
    return this.permissions.listBySubjectAndType(subjectId, 'space')
  }

  /**
   * Resolve the effective permission a user has on a resource by
   * walking up the hierarchy: file -> parent folder(s) -> space.
   *
   * Returns null if the user has no access at all.
   *
   * Owner check is intentionally excluded — callers should check
   * ownership separately (ownerId === subjectId) before falling
   * through to this method, since owners implicitly have admin.
   */
  async resolve(
    objectId: string,
    objectType: ObjectType,
    subjectId: string
  ): Promise<EffectivePermission | null> {
    // Check direct grant first
    const direct = await this.permissions.getPermission(objectId, subjectId)
    if (direct) {
      return {
        role: direct.role,
        sourceObjectId: direct.objectId,
        sourceObjectType: direct.objectType
      }
    }

    // For spaces there is no parent to check
    if (objectType === 'space') return null

    // Walk up the folder chain
    const entry = await this.catalog.getEntry(objectId)
    if (!entry) return null

    let currentParentId = entry.parentId
    while (currentParentId) {
      const parentGrant = await this.permissions.getPermission(currentParentId, subjectId)
      if (parentGrant) {
        return {
          role: parentGrant.role,
          sourceObjectId: parentGrant.objectId,
          sourceObjectType: parentGrant.objectType
        }
      }

      const parent = await this.catalog.getEntry(currentParentId)
      if (!parent) break
      currentParentId = parent.parentId
    }

    // Finally check the space itself
    const spaceGrant = await this.permissions.getPermission(entry.spaceId, subjectId)
    if (spaceGrant) {
      return {
        role: spaceGrant.role,
        sourceObjectId: spaceGrant.objectId,
        sourceObjectType: spaceGrant.objectType
      }
    }

    return null
  }

  /**
   * Check whether a user has at least the given role on a resource.
   * Includes the owner shortcut — owners always have admin.
   */
  async canAccess(
    objectId: string,
    objectType: ObjectType,
    subjectId: string,
    requiredRole: PermissionRole,
    ownerId?: string
  ): Promise<boolean> {
    // Owners implicitly have admin
    if (ownerId && ownerId === subjectId) return true

    const effective = await this.resolve(objectId, objectType, subjectId)
    if (!effective) return false

    return ROLE_RANK[effective.role] >= ROLE_RANK[requiredRole]
  }

  private async resolveObjectName(objectId: string, objectType: ObjectType): Promise<string> {
    if (objectType === 'space') {
      const space = await this.catalog.getSpace(objectId)
      return space?.name ?? objectId
    }
    const entry = await this.catalog.getEntry(objectId)
    return entry?.name ?? objectId
  }
}
