import type { IActivityRepository } from '../ports/repositories/activity.repository.port'
import type { Activity, ActivityAction } from '../domain/activity'
import type { ObjectType } from '../domain/permission'

export class ActivityService {
  constructor(
    private readonly activities: IActivityRepository
  ) {}

  async record(params: {
    actorId: string
    action: ActivityAction
    objectId: string
    objectType: ObjectType
    objectName: string
    targetUserId?: string
  }): Promise<void> {
    const activity: Activity = {
      id: crypto.randomUUID(),
      actorId: params.actorId,
      action: params.action,
      objectId: params.objectId,
      objectType: params.objectType,
      objectName: params.objectName,
      targetUserId: params.targetUserId ?? null,
      createdAt: new Date()
    }
    await this.activities.record(activity)
  }

  async listForViewer(viewerId: string, limit: number, before?: Date): Promise<Activity[]> {
    return this.activities.listForViewer(viewerId, limit, before)
  }

  async listForActor(actorId: string, limit: number, before?: Date): Promise<Activity[]> {
    return this.activities.listForActor(actorId, limit, before)
  }
}
