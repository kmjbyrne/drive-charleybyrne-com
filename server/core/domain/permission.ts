export type ObjectType = 'file' | 'folder' | 'space'
export type PermissionRole = 'viewer' | 'editor' | 'admin'

export interface ObjectPermission {
  id: string
  objectId: string
  objectType: ObjectType
  subjectId: string
  role: PermissionRole
  grantedBy: string
  createdAt: Date
}

/**
 * The effective permission a user has on a resource after inheritance
 * resolution. Includes the source so callers can distinguish direct
 * grants from inherited ones.
 */
export interface EffectivePermission {
  role: PermissionRole
  // The object that actually holds the grant (may differ from the
  // queried object when the permission is inherited from a parent
  // folder or space).
  sourceObjectId: string
  sourceObjectType: ObjectType
}

// Role hierarchy used for comparisons (higher = more powerful)
export const ROLE_RANK: Record<PermissionRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3
}
