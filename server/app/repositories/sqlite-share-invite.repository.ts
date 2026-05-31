import { eq, and } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { IShareInviteRepository } from '../../core/ports/repositories/share-invite.repository.port'
import type { ShareInvite } from '../../core/domain/share-invite'
import * as schema from '../../database/schema'

export class SqliteShareInviteRepository implements IShareInviteRepository {
  constructor(
    private readonly db: BetterSQLite3Database<typeof schema>
  ) {}

  async create(invite: ShareInvite): Promise<ShareInvite> {
    await this.db
      .insert(schema.shareInvites)
      .values({
        id: invite.id,
        objectId: invite.objectId,
        objectType: invite.objectType,
        email: invite.email,
        role: invite.role,
        grantedBy: invite.grantedBy,
        createdAt: invite.createdAt
      })
    return invite
  }

  async listByObject(objectId: string): Promise<ShareInvite[]> {
    const rows = await this.db
      .select()
      .from(schema.shareInvites)
      .where(eq(schema.shareInvites.objectId, objectId))
      .all()
    return rows.map(r => this.toModel(r))
  }

  async listByEmail(email: string): Promise<ShareInvite[]> {
    const rows = await this.db
      .select()
      .from(schema.shareInvites)
      .where(eq(schema.shareInvites.email, email.toLowerCase()))
      .all()
    return rows.map(r => this.toModel(r))
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(schema.shareInvites)
      .where(eq(schema.shareInvites.id, id))
  }

  async listByGranter(grantedBy: string): Promise<ShareInvite[]> {
    const rows = await this.db
      .select()
      .from(schema.shareInvites)
      .where(eq(schema.shareInvites.grantedBy, grantedBy))
      .all()
    return rows.map(r => this.toModel(r))
  }

  async deleteByObjectAndEmail(objectId: string, email: string): Promise<void> {
    await this.db
      .delete(schema.shareInvites)
      .where(
        and(
          eq(schema.shareInvites.objectId, objectId),
          eq(schema.shareInvites.email, email.toLowerCase())
        )
      )
  }

  private toModel(row: typeof schema.shareInvites.$inferSelect): ShareInvite {
    return {
      id: row.id,
      objectId: row.objectId,
      objectType: row.objectType as ShareInvite['objectType'],
      email: row.email,
      role: row.role as ShareInvite['role'],
      grantedBy: row.grantedBy,
      createdAt: row.createdAt
    }
  }
}
