import { container } from '../../app/container'
import { requireAuth } from '../../app/auth'
import { requireAccess } from '../../app/guards'
import { parseBoundary, parseMultipartStream } from '../../app/multipart-stream'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const boundary = parseBoundary(getRequestHeader(event, 'content-type'))
  if (!boundary) {
    throw createError({ statusCode: 400, message: 'Expected multipart/form-data' })
  }

  // Stream the request rather than buffering it: h3's readMultipartFormData
  // parses byte-by-byte into a JS array and throws RangeError on large files.
  const { fields, file } = await parseMultipartStream(event.node.req, boundary)

  if (!file) {
    throw createError({ statusCode: 400, message: 'Missing file in form data' })
  }

  const spaceId = fields.spaceId
  const parentId = fields.parentId || null

  // Fields are only populated if they precede the file part in the body.
  if (!spaceId) {
    file.stream.resume()
    throw createError({ statusCode: 400, message: 'spaceId is required and must precede the file' })
  }

  const space = await container.catalogRepo.getSpace(spaceId)
  if (!space) {
    file.stream.resume()
    throw createError({ statusCode: 404, message: 'Space not found' })
  }

  try {
    await requireAccess(user, spaceId, 'space', 'editor', space.ownerId)
  } catch (err) {
    file.stream.resume()
    throw err
  }

  return container.storageService.uploadStream({
    userId: user.sub,
    spaceId,
    parentId,
    fileName: file.fileName,
    contentType: file.contentType,
    body: file.stream
  })
})
