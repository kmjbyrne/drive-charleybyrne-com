import { container } from '../../app/container'
import { requireAuth } from '../../app/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const ownedSpaces = await container.catalogRepo.listSpaces(user.sub)

  if (ownedSpaces.length === 0) {
    const defaultSpace = await container.catalogRepo.createSpace({
      id: crypto.randomUUID(),
      name: 'My Files',
      icon: 'i-lucide-folder',
      color: '#10b981',
      ownerId: user.sub,
      createdAt: new Date()
    })
    ownedSpaces.push(defaultSpace)
  }

  // Include spaces shared with this user
  const sharedPermissions = await container.permissionService.listAccessibleSpaces(user.sub)
  const sharedSpaces = []
  for (const perm of sharedPermissions) {
    const space = await container.catalogRepo.getSpace(perm.objectId)
    if (space) {
      sharedSpaces.push({ ...space, shared: true, role: perm.role })
    }
  }

  return [
    ...ownedSpaces.map(s => ({ ...s, shared: false })),
    ...sharedSpaces
  ]
})
