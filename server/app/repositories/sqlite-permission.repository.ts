import { eq, and } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { IPermissionRepository } from '../../core/ports/repositories/permission.repository.port'
import type { ObjectPermission, ObjectType } from '../../core/domain/permission'
import * as schema from '../../database/schema'

export class SqlitePermissionRepository implements IPermissionRepository {
  constructor(
    private readonly db: BetterSQLite3Database<typeof schema>
  ) {}

  async grant(permission: ObjectPermission): Promise<ObjectPermission> {
    // Upsert: if a grant already exists for this object+subject, replace it
    const existing = await this.getPermission(permission.objectId, permission.subjectId)
    if (existing) {
      await this.db
        .update(schema.objectPermissions)
        .set({ role: permission.role, grantedBy: permission.grantedBy })
        .where(eq(schema.objectPermissions.id, existing.id))
      return { ...existing, role: permission.role, grantedBy: permission.grantedBy }
    }

    await this.db.insert(schema.objectPermissions).values({
      id: permission.id,
      objectId: permission.objectId,
      objectType: permission.objectType,
      subjectId: permission.subjectId,
      role: permission.role,
      grantedBy: permission.grantedBy,
      createdAt: permission.createdAt
    })
    return permission
  }

  async revoke(objectId: string, subjectId: string): Promise<void> {
    await this.db
      .delete(schema.objectPermissions)
      .where(
        and(
          eq(schema.objectPermissions.objectId, objectId),
          eq(schema.objectPermissions.subjectId, subjectId)
        )
      )
  }

  async getPermission(objectId: string, subjectId: string): Promise<ObjectPermission | null> {
    const row = await this.db
      .select()
      .from(schema.objectPermissions)
      .where(
        and(
          eq(schema.objectPermissions.objectId, objectId),
          eq(schema.objectPermissions.subjectId, subjectId)
        )
      )
      .get()

    if (!row) return null
    return this.toModel(row)
  }

  async listByObject(objectId: string): Promise<ObjectPermission[]> {
    const rows = await this.db
      .select()
      .from(schema.objectPermissions)
      .where(eq(schema.objectPermissions.objectId, objectId))
      .all()
    return rows.map(r => this.toModel(r))
  }

  async listBySubject(subjectId: string): Promise<ObjectPermission[]> {
    const rows = await this.db
      .select()
      .from(schema.objectPermissions)
      .where(eq(schema.objectPermissions.subjectId, subjectId))
      .all()
    return rows.map(r => this.toModel(r))
  }

  async listBySubjectAndType(
    subjectId: string,
    objectType: ObjectType
  ): Promise<ObjectPermission[]> {
    const rows = await this.db
      .select()
      .from(schema.objectPermissions)
      .where(
        and(
          eq(schema.objectPermissions.subjectId, subjectId),
          eq(schema.objectPermissions.objectType, objectType)
        )
      )
      .all()
    return rows.map(r => this.toModel(r))
  }

  async listByGranter(grantedBy: string): Promise<ObjectPermission[]> {
    const rows = await this.db
      .select()
      .from(schema.objectPermissions)
      .where(eq(schema.objectPermissions.grantedBy, grantedBy))
      .all()
    return rows.map(r => this.toModel(r))
  }

  private toModel(row: typeof schema.objectPermissions.$inferSelect): ObjectPermission {
    return {
      id: row.id,
      objectId: row.objectId,
      objectType: row.objectType as ObjectType,
      subjectId: row.subjectId,
      role: row.role as ObjectPermission['role'],
      grantedBy: row.grantedBy,
      createdAt: row.createdAt
    }
  }
}
