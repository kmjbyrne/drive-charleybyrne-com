import type { ICatalogRepository } from '../ports/repositories/catalog.repository.port'
import type { IUserRepository } from '../ports/repositories/user.repository.port'

export interface QuotaStatus {
  usedBytes: number
  totalBytes: number
  remainingBytes: number
}

/**
 * Resolves and enforces per-user storage limits.
 *
 * A user's limit comes from users.quota_bytes; when that is null the
 * configured default applies. Usage is derived from the catalog, so trashing
 * a file frees quota without any counter to keep in sync.
 */
export class QuotaService {
  constructor(
    private readonly catalog: ICatalogRepository,
    private readonly users: IUserRepository,
    private readonly defaultQuotaBytes: number
  ) {}

  async resolveLimit(userId: string): Promise<number> {
    const user = await this.users.getById(userId)
    const quota = user?.quotaBytes
    return quota === null || quota === undefined ? this.defaultQuotaBytes : quota
  }

  async getStatus(userId: string): Promise<QuotaStatus> {
    const [usedBytes, totalBytes] = await Promise.all([
      this.catalog.getUsedBytes(userId),
      this.resolveLimit(userId)
    ])

    return {
      usedBytes,
      totalBytes,
      remainingBytes: Math.max(0, totalBytes - usedBytes)
    }
  }

  /**
   * Bytes this user may still write. Used to bound an upload before, and
   * while, its body is read.
   */
  async remainingBytes(userId: string): Promise<number> {
    const { remainingBytes } = await this.getStatus(userId)
    return remainingBytes
  }

  async setQuota(userId: string, quotaBytes: number | null): Promise<void> {
    if (quotaBytes !== null && (!Number.isFinite(quotaBytes) || quotaBytes < 0)) {
      throw createError({ statusCode: 400, message: 'quotaBytes must be a non-negative number or null' })
    }
    await this.users.setQuota(userId, quotaBytes)
  }
}
