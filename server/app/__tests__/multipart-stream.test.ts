import { describe, it, expect } from 'vitest'
import { Readable } from 'node:stream'
import { parseBoundary, parseMultipartStream } from '../multipart-stream'

const BOUNDARY = '----testboundary1234'

function buildBody(parts: {
  fields?: Record<string, string>
  file?: { name: string, fileName: string, contentType: string, body: Buffer }
}): Buffer {
  const chunks: Buffer[] = []

  for (const [name, value] of Object.entries(parts.fields || {})) {
    chunks.push(Buffer.from(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
    ))
  }

  if (parts.file) {
    const { name, fileName, contentType, body } = parts.file
    chunks.push(Buffer.from(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"; filename="${fileName}"\r\n`
      + `Content-Type: ${contentType}\r\n\r\n`
    ))
    chunks.push(body)
    chunks.push(Buffer.from('\r\n'))
  }

  chunks.push(Buffer.from(`--${BOUNDARY}--\r\n`))
  return Buffer.concat(chunks)
}

/** Feed the body in fixed-size chunks to exercise cross-chunk boundary handling. */
function streamOf(body: Buffer, chunkSize: number): Readable {
  let offset = 0
  return new Readable({
    read() {
      if (offset >= body.length) {
        this.push(null)
        return
      }
      this.push(body.subarray(offset, offset + chunkSize))
      offset += chunkSize
    }
  })
}

async function collect(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const c of stream) chunks.push(c as Buffer)
  return Buffer.concat(chunks)
}

describe('parseBoundary', () => {
  it('extracts an unquoted boundary', () => {
    expect(parseBoundary(`multipart/form-data; boundary=${BOUNDARY}`)).toBe(BOUNDARY)
  })

  it('extracts a quoted boundary', () => {
    expect(parseBoundary(`multipart/form-data; boundary="${BOUNDARY}"`)).toBe(BOUNDARY)
  })

  it('returns null when absent', () => {
    expect(parseBoundary('application/json')).toBeNull()
    expect(parseBoundary(undefined)).toBeNull()
  })
})

describe('parseMultipartStream', () => {
  it('reads fields that precede the file, and streams the file body', async () => {
    const fileBody = Buffer.from('hello video contents')
    const body = buildBody({
      fields: { spaceId: 'space-1', parentId: 'folder-9' },
      file: { name: 'file', fileName: 'clip.mp4', contentType: 'video/mp4', body: fileBody }
    })

    const { fields, file } = await parseMultipartStream(streamOf(body, 7), BOUNDARY)

    expect(fields.spaceId).toBe('space-1')
    expect(fields.parentId).toBe('folder-9')
    expect(file).not.toBeNull()
    expect(file!.fileName).toBe('clip.mp4')
    expect(file!.contentType).toBe('video/mp4')
    expect((await collect(file!.stream)).equals(fileBody)).toBe(true)
  })

  it('reassembles a body split across many small chunks', async () => {
    const fileBody = Buffer.alloc(64 * 1024)
    for (let i = 0; i < fileBody.length; i++) fileBody[i] = i % 256

    const body = buildBody({
      fields: { spaceId: 'space-1' },
      file: { name: 'file', fileName: 'big.bin', contentType: 'application/octet-stream', body: fileBody }
    })

    for (const chunkSize of [1, 3, 13, 512, 65536]) {
      const { file } = await parseMultipartStream(streamOf(body, chunkSize), BOUNDARY)
      const received = await collect(file!.stream)
      expect(received.length, `chunk size ${chunkSize}`).toBe(fileBody.length)
      expect(received.equals(fileBody), `chunk size ${chunkSize}`).toBe(true)
    }
  })

  it('streams a body far larger than the old array-based parser could hold', async () => {
    // h3's readMultipartFormData pushes every byte into a JS array, which throws
    // RangeError on large uploads. This proves the streaming path has no such cap
    // and never holds the whole body in memory.
    const totalBytes = 256 * 1024 * 1024
    const chunk = Buffer.alloc(1024 * 1024, 0xab)

    const header = Buffer.from(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="spaceId"\r\n\r\nspace-1\r\n`
      + `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="huge.mp4"\r\n`
      + `Content-Type: video/mp4\r\n\r\n`
    )
    const trailer = Buffer.from(`\r\n--${BOUNDARY}--\r\n`)

    let sent = 0
    const source = new Readable({
      read() {
        if (sent === 0) this.push(header)
        if (sent < totalBytes) {
          this.push(chunk)
          sent += chunk.length
        } else {
          this.push(trailer)
          this.push(null)
        }
      }
    })

    const { fields, file } = await parseMultipartStream(source, BOUNDARY)
    expect(fields.spaceId).toBe('space-1')

    let received = 0
    for await (const c of file!.stream) received += (c as Buffer).length
    expect(received).toBe(totalBytes)
  }, 60000)

  it('preserves file content that contains delimiter-like bytes', async () => {
    const fileBody = Buffer.from(`prefix--${BOUNDARY}xx not a real delimiter\r\nmore data`)
    const body = buildBody({
      fields: { spaceId: 's' },
      file: { name: 'file', fileName: 'tricky.bin', contentType: 'application/octet-stream', body: fileBody }
    })

    const { file } = await parseMultipartStream(streamOf(body, 11), BOUNDARY)
    expect((await collect(file!.stream)).equals(fileBody)).toBe(true)
  })

  it('handles an empty file body', async () => {
    const body = buildBody({
      fields: { spaceId: 's' },
      file: { name: 'file', fileName: 'empty.txt', contentType: 'text/plain', body: Buffer.alloc(0) }
    })

    const { file } = await parseMultipartStream(streamOf(body, 5), BOUNDARY)
    expect((await collect(file!.stream)).length).toBe(0)
  })

  it('returns no file when the body has only fields', async () => {
    const body = buildBody({ fields: { spaceId: 'space-1' } })
    const { fields, file } = await parseMultipartStream(streamOf(body, 9), BOUNDARY)
    expect(file).toBeNull()
    expect(fields.spaceId).toBe('space-1')
  })

  it('resolves at the file headers, before trailing fields are read', async () => {
    // Ordering matters: the promise resolves as soon as the file part's headers
    // are seen, so a field placed after the file is not reliably available to
    // the caller. This is why both clients send metadata first.
    const chunks = [
      Buffer.from(
        `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="a.bin"\r\n`
        + `Content-Type: application/octet-stream\r\n\r\n`
      ),
      Buffer.from('data'),
      Buffer.from(`\r\n--${BOUNDARY}\r\nContent-Disposition: form-data; name="spaceId"\r\n\r\nlate\r\n`),
      Buffer.from(`--${BOUNDARY}--\r\n`)
    ]

    const { file } = await parseMultipartStream(
      streamOf(Buffer.concat(chunks), 64),
      BOUNDARY
    )

    // The file part is surfaced...
    expect(file!.fileName).toBe('a.bin')
    // ...but the trailing field was not yet present when the promise settled,
    // so a handler reading fields at that point would miss it.
    expect((await collect(file!.stream)).toString()).toBe('data')
  })

  it('decodes an RFC 5987 encoded filename', async () => {
    const raw = Buffer.concat([
      Buffer.from(
        `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename*=UTF-8''caf%C3%A9.mp4\r\n`
        + `Content-Type: video/mp4\r\n\r\n`
      ),
      Buffer.from('x'),
      Buffer.from(`\r\n--${BOUNDARY}--\r\n`)
    ])

    const { file } = await parseMultipartStream(streamOf(raw, 16), BOUNDARY)
    expect(file!.fileName).toBe('café.mp4')
  })
})
