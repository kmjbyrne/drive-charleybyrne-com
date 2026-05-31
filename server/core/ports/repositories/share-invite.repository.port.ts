import type { ShareInvite } from '../../domain/share-invite'

export interface IShareInviteRepository {
  create(invite: ShareInvite): Promise<ShareInvite>
  listByObject(objectId: string): Promise<ShareInvite[]>
  listByEmail(email: string): Promise<ShareInvite[]>
  delete(id: string): Promise<void>
  deleteByObjectAndEmail(objectId: string, email: string): Promise<void>
  listByGranter(grantedBy: string): Promise<ShareInvite[]>
}
