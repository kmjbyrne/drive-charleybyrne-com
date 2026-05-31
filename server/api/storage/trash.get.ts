import { container } from '../../app/container'
import { requireAuth } from '../../app/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  return container.catalogRepo.listTrashed(user.sub)
})
