import { eq, or, desc, lt, and } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { IActivityRepository } from '../../core/ports/repositories/activity.repository.port'
import type { Activity } from '../../core/domain/activity'
import type { ActivityAction } from '../../core/domain/activity'
import type { ObjectType } from '../../core/domain/permission'
import * as schema from '../../database/schema'

export class SqliteActivityRepository implements IActivityRepository {
  constructor(
    private readonly db: BetterSQLite3Database<typeof schema>
  ) {}

  async record(activity: Activity): Promise<void> {
    await this.db.insert(schema.activities).values({
      id: activity.id,
      actorId: activity.actorId,
      action: activity.action,
      objectId: activity.objectId,
      objectType: activity.objectType,
      objectName: activity.objectName,
      targetUserId: activity.targetUserId,
      createdAt: activity.createdAt
    })
  }

  async listForActor(actorId: string, limit: number, before?: Date): Promise<Activity[]> {
    const conditions = [eq(schema.activities.actorId, actorId)]
    if (before) {
      conditions.push(lt(schema.activities.createdAt, before))
    }

    const rows = await this.db
      .select()
      .from(schema.activities)
      .where(and(...conditions))
      .orderBy(desc(schema.activities.createdAt))
      .limit(limit)
      .all()

    return rows.map(r => this.toModel(r))
  }

  async listForViewer(viewerId: string, limit: number, before?: Date): Promise<Activity[]> {
    const viewerCondition = or(
      eq(schema.activities.actorId, viewerId),
      eq(schema.activities.targetUserId, viewerId)
    )

    const conditions = [viewerCondition!]
    if (before) {
      conditions.push(lt(schema.activities.createdAt, before))
    }

    const rows = await this.db
      .select()
      .from(schema.activities)
      .where(and(...conditions))
      .orderBy(desc(schema.activities.createdAt))
      .limit(limit)
      .all()

    return rows.map(r => this.toModel(r))
  }

  private toModel(row: typeof schema.activities.$inferSelect): Activity {
    return {
      id: row.id,
      actorId: row.actorId,
      action: row.action as ActivityAction,
      objectId: row.objectId,
      objectType: row.objectType as ObjectType,
      objectName: row.objectName,
      targetUserId: row.targetUserId,
      createdAt: row.createdAt
    }
  }
}
