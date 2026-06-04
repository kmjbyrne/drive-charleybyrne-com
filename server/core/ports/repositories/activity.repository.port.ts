import type { Activity } from '../../domain/activity'

export interface IActivityRepository {
  record(activity: Activity): Promise<void>
  listForActor(actorId: string, limit: number, before?: Date): Promise<Activity[]>
  listForViewer(viewerId: string, limit: number, before?: Date): Promise<Activity[]>
}
