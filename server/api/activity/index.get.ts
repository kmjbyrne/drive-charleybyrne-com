import { z } from 'zod'
import { container } from '../../app/container'
import { requireAuth } from '../../app/auth'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = await getValidatedQuery(event, querySchema.parse)

  const before = query.before ? new Date(query.before) : undefined
  const activities = await container.activityService.listForViewer(
    user.sub,
    query.limit,
    before
  )

  // Collect unique user IDs to bulk-resolve display names
  const userIds = [...new Set([
    ...activities.map(a => a.actorId),
    ...activities.filter(a => a.targetUserId).map(a => a.targetUserId!)
  ])]
  const users = await container.userRepo.getByIds(userIds)
  const userMap = new Map(users.map(u => [u.id, u]))

  return activities.map(a => {
    const actor = userMap.get(a.actorId)
    const target = a.targetUserId ? userMap.get(a.targetUserId) : null
    return {
      id: a.id,
      action: a.action,
      objectId: a.objectId,
      objectType: a.objectType,
      objectName: a.objectName,
      actor: actor
        ? { id: actor.id, firstName: actor.firstName, lastName: actor.lastName, avatar: actor.avatar }
        : { id: a.actorId, firstName: 'Unknown', lastName: 'User', avatar: null },
      target: target
        ? { id: target.id, firstName: target.firstName, lastName: target.lastName, avatar: target.avatar }
        : null,
      createdAt: a.createdAt.toISOString()
    }
  })
})
