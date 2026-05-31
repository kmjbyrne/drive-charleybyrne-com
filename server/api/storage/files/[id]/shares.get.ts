import { container } from '../../../../app/container'
import { requireAuth } from '../../../../app/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'File ID is required' })
  }

  const entry = await container.catalogRepo.getEntry(id)
  if (!entry) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  const permissions = await container.permissionService.listCollaborators(id)

  // Enrich with user info
  const subjectIds = permissions.map(p => p.subjectId)
  const users = await container.userRepo.getByIds(subjectIds)
  const userMap = new Map(users.map(u => [u.id, u]))

  return permissions.map((p) => {
    const u = userMap.get(p.subjectId)
    return {
      id: p.id,
      role: p.role,
      createdAt: p.createdAt,
      user: u
        ? { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, avatar: u.avatar }
        : { id: p.subjectId, email: '', firstName: 'Unknown', lastName: 'User', avatar: null }
    }
  })
})
