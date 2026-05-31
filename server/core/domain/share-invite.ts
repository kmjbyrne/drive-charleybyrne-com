import type { ObjectType, PermissionRole } from './permission'

export interface ShareInvite {
  id: string
  objectId: string
  objectType: ObjectType
  email: string
  role: PermissionRole
  grantedBy: string
  createdAt: Date
}
