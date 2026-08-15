import { describe, it, expect } from 'vitest'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createQuotaLimitStream, QuotaExceededError } from '../quota-limit-stream'

async function pump(chunks: Buffer[], limit: number): Promise<number> {
  let received = 0
  const sink = new (await import('node:stream')).Writable({
    write(chunk: Buffer, _enc, cb) {
      received += chunk.length
      cb()
    }
  })

  await pipeline(Readable.from(chunks), createQuotaLimitStream(limit), sink)
  return received
}

describe('createQuotaLimitStream', () => {
  it('passes a body through untouched when it fits', async () => {
    const received = await pump([Buffer.alloc(40), Buffer.alloc(40)], 100)
    expect(received).toBe(80)
  })

  it('allows a body exactly at the limit', async () => {
    const received = await pump([Buffer.alloc(50), Buffer.alloc(50)], 100)
    expect(received).toBe(100)
  })

  it('fails once the body exceeds the limit', async () => {
    await expect(pump([Buffer.alloc(60), Buffer.alloc(60)], 100))
      .rejects.toBeInstanceOf(QuotaExceededError)
  })

  it('rejects any non-empty body when the limit is zero', async () => {
    await expect(pump([Buffer.alloc(1)], 0))
      .rejects.toBeInstanceOf(QuotaExceededError)
  })

  it('stops reading rather than draining the whole oversized body', async () => {
    // A client that under-reports Content-Length must not be able to make us
    // write past the cap: the stream fails partway, not at the end.
    let produced = 0
    const source = new Readable({
      read() {
        produced += 1024
        this.push(Buffer.alloc(1024))
        if (produced > 10 * 1024 * 1024) this.push(null)
      }
    })

    await expect(
      pipeline(source, createQuotaLimitStream(4096), new (await import('node:stream')).Writable({
        write(_c, _e, cb) {
          cb()
        }
      }))
    ).rejects.toBeInstanceOf(QuotaExceededError)

    expect(produced).toBeLessThan(10 * 1024 * 1024)
  })

  it('reports the limit it enforced', async () => {
    await expect(pump([Buffer.alloc(10)], 5)).rejects.toMatchObject({ limitBytes: 5 })
  })
})
