import { container } from '../../../app/container'
import { requireAuth } from '../../../app/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const q = (query.q as string || '').trim()

  if (q.length < 2) return []

  const results = await container.userRepo.findByEmail(q, user.tid)
  // Exclude the current user from results
  return results
    .filter(u => u.id !== user.sub)
    .map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      avatar: u.avatar
    }))
})
