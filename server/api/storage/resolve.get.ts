import { container } from '../../app/container'
import { requireAuth } from '../../app/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const query = getQuery(event)
  const spaceId = query.spaceId as string
  // Comma-separated folder names forming the path
  const pathParam = query.path as string | undefined

  if (!spaceId) {
    throw createError({ statusCode: 400, message: 'spaceId is required' })
  }

  const segments = pathParam ? pathParam.split(',').filter(Boolean) : []

  const trail: { id: string, name: string, type: 'space' | 'folder' }[] = []

  // Add the space as the first breadcrumb
  const space = await container.catalogRepo.getSpace(spaceId)
  if (!space) {
    throw createError({ statusCode: 404, message: 'Space not found' })
  }
  trail.push({ id: space.id, name: space.name, type: 'space' })

  // Walk down the folder path by name
  let currentParentId: string | null = null
  for (const name of segments) {
    const entry = await container.catalogRepo.findChildByName(
      currentParentId,
      spaceId,
      name
    )
    if (!entry || entry.type !== 'folder') {
      throw createError({
        statusCode: 404,
        message: `Folder not found: ${name}`
      })
    }
    trail.push({ id: entry.id, name: entry.name, type: 'folder' })
    currentParentId = entry.id
  }

  return {
    parentId: currentParentId,
    trail
  }
})
