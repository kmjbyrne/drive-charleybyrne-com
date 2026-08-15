import { Transform } from 'node:stream'

export class QuotaExceededError extends Error {
  readonly limitBytes: number

  constructor(limitBytes: number) {
    super('Storage quota exceeded')
    this.name = 'QuotaExceededError'
    this.limitBytes = limitBytes
  }
}

/**
 * Passes bytes through until more than `limitBytes` have been seen, then fails
 * the stream with QuotaExceededError.
 *
 * Content-Length is a hint the client controls, so the limit has to be applied
 * to the bytes actually received. This keeps a client that under-reports its
 * size from writing past the cap.
 */
export function createQuotaLimitStream(limitBytes: number): Transform {
  let written = 0

  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      written += chunk.length
      if (written > limitBytes) {
        callback(new QuotaExceededError(limitBytes))
        return
      }
      callback(null, chunk)
    }
  })
}
