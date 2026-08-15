import { describe, it, expect } from 'vitest'
import { QuotaService } from '../quota.service'
import type { ICatalogRepository } from '../../ports/repositories/catalog.repository.port'
import type { IUserRepository } from '../../ports/repositories/user.repository.port'
import type { LocalUser } from '../../domain/user'

const DEFAULT_QUOTA = 1000

function makeUser(quotaBytes: number | null): LocalUser {
  return {
    id: 'user-1',
    email: 'a@b.c',
    firstName: 'A',
    lastName: 'B',
    avatar: null,
    tid: 't',
    quotaBytes,
    lastSeenAt: new Date()
  }
}

function build(used: number, user: LocalUser | null) {
  const quotas = new Map<string, number | null>()

  const catalog = {
    async getUsedBytes() {
      return used
    }
  } as unknown as ICatalogRepository

  const users = {
    async getById() {
      return user
    },
    async setQuota(id: string, quotaBytes: number | null) {
      quotas.set(id, quotaBytes)
    }
  } as unknown as IUserRepository

  return { service: new QuotaService(catalog, users, DEFAULT_QUOTA), quotas }
}

describe('QuotaService', () => {
  it('falls back to the configured default when the user has no quota set', async () => {
    const { service } = build(200, makeUser(null))
    expect(await service.resolveLimit('user-1')).toBe(DEFAULT_QUOTA)
  })

  it('uses the per-user quota when one is set', async () => {
    const { service } = build(200, makeUser(5000))
    expect(await service.resolveLimit('user-1')).toBe(5000)
  })

  it('honours a zero quota rather than treating it as unset', async () => {
    // 0 is falsy, so a `||` fallback would wrongly hand back the default here.
    const { service } = build(0, makeUser(0))
    expect(await service.resolveLimit('user-1')).toBe(0)
    expect(await service.remainingBytes('user-1')).toBe(0)
  })

  it('falls back to the default for an unknown user', async () => {
    const { service } = build(0, null)
    expect(await service.resolveLimit('user-1')).toBe(DEFAULT_QUOTA)
  })

  it('reports used, total and remaining', async () => {
    const { service } = build(300, makeUser(1200))
    expect(await service.getStatus('user-1')).toEqual({
      usedBytes: 300,
      totalBytes: 1200,
      remainingBytes: 900
    })
  })

  it('never reports negative remaining bytes when over quota', async () => {
    const { service } = build(1500, makeUser(1000))
    const status = await service.getStatus('user-1')
    expect(status.remainingBytes).toBe(0)
    expect(status.usedBytes).toBe(1500)
  })

  it('stores a new quota and allows clearing it back to the default', async () => {
    const { service, quotas } = build(0, makeUser(null))

    await service.setQuota('user-1', 4096)
    expect(quotas.get('user-1')).toBe(4096)

    await service.setQuota('user-1', null)
    expect(quotas.get('user-1')).toBeNull()
  })

  it('rejects a negative quota', async () => {
    const { service } = build(0, makeUser(null))
    await expect(service.setQuota('user-1', -1)).rejects.toThrow()
  })
})
