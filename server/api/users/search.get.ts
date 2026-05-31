import { container } from '../../app/container'
import { requireAuth } from '../../app/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const q = (query.q as string || '').trim()

  if (q.length < 3) {
    throw createError({ statusCode: 400, message: 'Query must be at least 3 characters' })
  }

  // Search across all known users (cross-tenant sharing is supported)
  const users = await container.userRepo.findByEmailGlobal(q)

  // Exclude the current user from results
  return users
    .filter(u => u.id !== user.sub)
    .map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      avatar: u.avatar
    }))
})
