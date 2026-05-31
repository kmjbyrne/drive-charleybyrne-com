import { container } from '../../app/container'
import { requireAuth } from '../../app/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const limit = Number(query.limit) || 20
  return container.catalogRepo.listRecent(user.sub, limit)
})
