import { PassThrough } from 'node:stream'
import type { Readable } from 'node:stream'

const DASH = 0x2d
const CR = 0x0d
const LF = 0x0a

export interface MultipartFile {
  fieldName: string
  fileName: string
  contentType: string
  stream: Readable
}

export interface MultipartStreamResult {
  fields: Record<string, string>
  file: MultipartFile | null
}

/**
 * Maximum size for a single non-file field. Field values are held in memory,
 * so a hostile client must not be able to grow one without bound.
 */
const MAX_FIELD_BYTES = 64 * 1024

export function parseBoundary(contentType: string | undefined): string | null {
  if (!contentType) return null
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType)
  const boundary = match?.[1] || match?.[2]
  return boundary ? boundary.trim() : null
}

function parseHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const line of raw.split('\r\n')) {
    const idx = line.indexOf(':')
    if (idx > 0) {
      headers[line.slice(0, idx).toLowerCase()] = line.slice(idx + 1).trim()
    }
  }
  return headers
}

function parseDisposition(value: string): { name?: string, filename?: string } {
  const out: { name?: string, filename?: string } = {}

  const star = /filename\*=UTF-8''([^;]+)/i.exec(value)
  if (star?.[1]) out.filename = decodeURIComponent(star[1].trim())

  const name = /(?:^|;)\s*name="([^"]*)"/i.exec(value)
  if (name?.[1] !== undefined) out.name = name[1]

  if (!out.filename) {
    const plain = /(?:^|;)\s*filename="([^"]*)"/i.exec(value)
    if (plain?.[1] !== undefined) {
      out.filename = Buffer.from(plain[1], 'latin1').toString('utf8')
    }
  }

  return out
}

/**
 * Incrementally parse a multipart/form-data body.
 *
 * Small fields are collected into memory; the first part carrying a filename is
 * surfaced as a stream so the caller can pipe it to storage. The promise
 * resolves as soon as that file part's headers are known — the body is still
 * arriving at that point, so the caller must consume the stream to completion.
 *
 * This exists because h3's readMultipartFormData buffers the whole request and
 * pushes it through a per-byte JS array, which throws RangeError on large
 * uploads.
 */
export function parseMultipartStream(
  source: Readable,
  boundary: string
): Promise<MultipartStreamResult> {
  return new Promise((resolve, reject) => {
    const delimiter = Buffer.from(`--${boundary}`)
    const fields: Record<string, string> = {}

    let buffer: Buffer = Buffer.alloc(0)
    let state: 'preamble' | 'headers' | 'field' | 'file' | 'epilogue' = 'preamble'
    let settled = false
    let fileStream: PassThrough | null = null
    let currentField: { name: string, chunks: Buffer[], size: number } | null = null

    const settle = (file: MultipartFile | null) => {
      if (settled) return
      settled = true
      resolve({ fields, file })
    }

    const fail = (err: Error) => {
      if (fileStream) fileStream.destroy(err)
      if (!settled) {
        settled = true
        reject(err)
      }
      source.off('data', onData)
      source.off('end', onEnd)
      source.off('error', fail)
    }

    // Find the delimiter, treating the tail conservatively: a partial match at
    // the end of the buffer may complete in the next chunk.
    const indexOfDelimiter = (buf: Buffer, from: number) =>
      buf.indexOf(delimiter, from)

    // Inside a part body, only a delimiter preceded by CRLF terminates it.
    // File content may legitimately contain the delimiter bytes otherwise.
    const indexOfBodyDelimiter = (buf: Buffer) => {
      let from = 0
      for (;;) {
        const idx = buf.indexOf(delimiter, from)
        if (idx === -1) return -1
        if (idx >= 2 && buf[idx - 2] === CR && buf[idx - 1] === LF) return idx
        from = idx + 1
      }
    }

    const emitFileChunk = (chunk: Buffer) => {
      if (chunk.length > 0 && fileStream) {
        if (!fileStream.write(chunk)) source.pause()
      }
    }

    function process(): boolean {
      switch (state) {
        case 'preamble': {
          const idx = indexOfDelimiter(buffer, 0)
          if (idx === -1) {
            // Keep only enough tail to complete a split delimiter
            if (buffer.length > delimiter.length) {
              buffer = buffer.subarray(buffer.length - delimiter.length)
            }
            return false
          }
          buffer = buffer.subarray(idx + delimiter.length)
          state = 'headers'
          return true
        }

        case 'headers': {
          // After a delimiter comes either "--" (end of body) or CRLF + headers
          if (buffer.length < 2) return false
          if (buffer[0] === DASH && buffer[1] === DASH) {
            state = 'epilogue'
            return true
          }
          const headerEnd = buffer.indexOf('\r\n\r\n')
          if (headerEnd === -1) return false

          // Skip the CRLF that follows the delimiter
          const start = buffer[0] === CR && buffer[1] === LF ? 2 : 0
          const raw = buffer.subarray(start, headerEnd).toString('utf8')
          buffer = buffer.subarray(headerEnd + 4)

          const headers = parseHeaders(raw)
          const disposition = parseDisposition(headers['content-disposition'] || '')

          if (disposition.filename !== undefined && !fileStream) {
            fileStream = new PassThrough()
            fileStream.on('drain', () => source.resume())
            state = 'file'
            settle({
              fieldName: disposition.name || 'file',
              fileName: disposition.filename,
              contentType: headers['content-type'] || 'application/octet-stream',
              stream: fileStream
            })
          } else if (disposition.filename !== undefined) {
            // A second file part is not expected; skip its body
            currentField = null
            state = 'field'
          } else {
            currentField = { name: disposition.name || '', chunks: [], size: 0 }
            state = 'field'
          }
          return true
        }

        case 'field':
        case 'file': {
          const idx = indexOfBodyDelimiter(buffer)

          if (idx === -1) {
            // Hold back a tail that might be the start of the delimiter,
            // plus the CRLF that precedes it.
            const keep = delimiter.length + 2
            if (buffer.length > keep) {
              const emit = buffer.subarray(0, buffer.length - keep)
              buffer = buffer.subarray(buffer.length - keep)
              if (state === 'file') {
                emitFileChunk(emit)
              } else if (currentField) {
                currentField.size += emit.length
                if (currentField.size > MAX_FIELD_BYTES) {
                  fail(new Error('Form field too large'))
                  return false
                }
                currentField.chunks.push(emit)
              }
            }
            return false
          }

          // Trim the CRLF that belongs to the delimiter, not the content
          let end = idx
          if (end >= 2 && buffer[end - 2] === CR && buffer[end - 1] === LF) {
            end -= 2
          }

          const body = buffer.subarray(0, end)
          if (state === 'file') {
            emitFileChunk(body)
            fileStream?.end()
            fileStream = null
          } else if (currentField) {
            currentField.chunks.push(body)
            fields[currentField.name] = Buffer.concat(currentField.chunks).toString('utf8')
            currentField = null
          }

          buffer = buffer.subarray(idx + delimiter.length)
          state = 'headers'
          return true
        }

        case 'epilogue':
          return false
      }
    }

    function onData(chunk: Buffer) {
      if (settled && state === 'epilogue') return
      buffer = buffer.length === 0 ? chunk : Buffer.concat([buffer, chunk])
      let more = true
      while (more) more = process()
    }

    function onEnd() {
      // Flush whatever is left; a well-formed body ends at the epilogue
      let more = true
      while (more) more = process()

      if (fileStream) {
        fileStream.end()
        fileStream = null
      }
      settle(null)
    }

    source.on('data', onData)
    source.on('end', onEnd)
    source.on('error', fail)
  })
}
