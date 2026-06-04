import type { ObjectType } from './permission'

export type ActivityAction =
  | 'file.uploaded'
  | 'file.renamed'
  | 'file.starred'
  | 'file.unstarred'
  | 'file.trashed'
  | 'file.restored'
  | 'file.deleted'
  | 'folder.created'
  | 'folder.deleted'
  | 'space.created'
  | 'space.deleted'
  | 'share.granted'
  | 'share.revoked'
  | 'share.invited'

export interface Activity {
  id: string
  actorId: string
  action: ActivityAction
  objectId: string
  objectType: ObjectType
  // Snapshot at event time — never updated if the object is later renamed
  objectName: string
  // Populated for share.* actions (the recipient)
  targetUserId: string | null
  createdAt: Date
}
