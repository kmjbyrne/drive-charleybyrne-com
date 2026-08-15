import type { LocalUser } from '../../domain/user'

export interface IUserRepository {
  upsert(user: LocalUser): Promise<void>
  findByEmail(query: string, tid: string): Promise<LocalUser[]>
  findByEmailGlobal(query: string): Promise<LocalUser[]>
  findByExactEmail(email: string): Promise<LocalUser | null>
  getById(id: string): Promise<LocalUser | null>
  getByIds(ids: string[]): Promise<LocalUser[]>
  /** Set a user's storage limit. Passing null restores the configured default. */
  setQuota(id: string, quotaBytes: number | null): Promise<void>
}
