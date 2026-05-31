import type {
  ObjectPermission,
  ObjectType
} from '../../domain/permission'

export interface IPermissionRepository {
  grant(permission: ObjectPermission): Promise<ObjectPermission>
  revoke(objectId: string, subjectId: string): Promise<void>
  getPermission(objectId: string, subjectId: string): Promise<ObjectPermission | null>
  listByObject(objectId: string): Promise<ObjectPermission[]>
  listBySubject(subjectId: string): Promise<ObjectPermission[]>
  listBySubjectAndType(subjectId: string, objectType: ObjectType): Promise<ObjectPermission[]>
  listByGranter(grantedBy: string): Promise<ObjectPermission[]>
}
