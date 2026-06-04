import { eq, like, and, inArray, sql } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { IUserRepository } from '../../core/ports/repositories/user.repository.port'
import type { LocalUser } from '../../core/domain/user'
import * as schema from '../../database/schema'

export class SqliteUserRepository implements IUserRepository {
  constructor(
    private readonly db: BetterSQLite3Database<typeof schema>
  ) {}

  async upsert(user: LocalUser): Promise<void> {
    await this.db
      .insert(schema.users)
      .values({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        tid: user.tid,
        lastSeenAt: new Date()
      })
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          tid: user.tid,
          lastSeenAt: new Date()
        }
      })
  }

  async findByEmail(query: string, tid: string): Promise<LocalUser[]> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(
        and(
          like(schema.users.email, `%${query}%`),
          eq(schema.users.tid, tid)
        )
      )
      .limit(10)
      .all()
    return rows.map(r => this.toModel(r))
  }

  async findByEmailGlobal(query: string): Promise<LocalUser[]> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(like(schema.users.email, `%${query}%`))
      .limit(10)
      .all()
    return rows.map(r => this.toModel(r))
  }

  async findByExactEmail(email: string): Promise<LocalUser | null> {
    const row = await this.db
      .select()
      .from(schema.users)
      .where(sql`lower(${schema.users.email}) = ${email.toLowerCase()}`)
      .get()
    return row ? this.toModel(row) : null
  }

  async getById(id: string): Promise<LocalUser | null> {
    const row = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .get()
    return row ? this.toModel(row) : null
  }

  async getByIds(ids: string[]): Promise<LocalUser[]> {
    if (ids.length === 0) return []
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(inArray(schema.users.id, ids))
      .all()
    return rows.map(r => this.toModel(r))
  }

  private toModel(row: typeof schema.users.$inferSelect): LocalUser {
    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      avatar: row.avatar,
      tid: row.tid,
      lastSeenAt: row.lastSeenAt
    }
  }
}
