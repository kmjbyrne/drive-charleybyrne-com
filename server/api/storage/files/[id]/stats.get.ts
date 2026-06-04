import { container } from '../../../../app/container'
import { requireAuth } from '../../../../app/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const folderId = getRouterParam(event, 'id')
  if (!folderId) {
    throw createError({ statusCode: 400, message: 'Missing folder id' })
  }

  const folder = await container.catalogRepo.getEntry(folderId)
  if (!folder || folder.type !== 'folder') {
    throw createError({ statusCode: 404, message: 'Folder not found' })
  }

  const children = await container.catalogRepo.listChildren(folderId, folder.spaceId)

  let files = 0
  let folders = 0
  for (const child of children) {
    if (child.type === 'folder') folders++
    else files++
  }

  return { files, folders }
})
