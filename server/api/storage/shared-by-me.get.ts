import { container } from '../../app/container'
import { requireAuth } from '../../app/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Get all permissions granted by this user + pending invites
  const [permissions, invites] = await Promise.all([
    container.permissionService.listSharedByMe(user.sub),
    container.shareInviteRepo.listByGranter(user.sub)
  ])

  // Collect unique object IDs from both sources
  const objectIds = [...new Set([
    ...permissions.map(p => p.objectId),
    ...invites.map(i => i.objectId)
  ])]

  // Bulk-fetch user details for all subjects
  const subjectIds = [...new Set(permissions.map(p => p.subjectId))]
  const users = await container.userRepo.getByIds(subjectIds)
  const userMap = new Map(users.map(u => [u.id, u]))

  const results = []

  for (const objectId of objectIds) {
    const perms = permissions.filter(p => p.objectId === objectId)
    const objInvites = invites.filter(i => i.objectId === objectId)

    // Resolve object details
    let name = objectId
    let ext: string | null = null
    let starred = false
    let sizeBytes = 0
    let blobKey: string | null = null
    let mimeType: string | null = null
    let modifiedAt: string = ''
    let createdAt: string = ''
    let objectType = perms[0]?.objectType || objInvites[0]?.objectType || 'file'

    if (objectType === 'space') {
      const space = await container.catalogRepo.getSpace(objectId)
      if (space) name = space.name
    } else {
      const entry = await container.catalogRepo.getEntry(objectId)
      if (entry) {
        name = entry.name
        ext = entry.ext
        starred = entry.starred ?? false
        sizeBytes = entry.sizeBytes
        blobKey = entry.blobKey
        mimeType = entry.mimeType
        modifiedAt = entry.modifiedAt ? new Date(entry.modifiedAt).toISOString() : ''
        createdAt = entry.createdAt ? new Date(entry.createdAt).toISOString() : ''
        objectType = entry.type === 'folder' ? 'folder' : 'file'
      }
    }

    const sharedWith = [
      ...perms.map((p) => {
        const u = userMap.get(p.subjectId)
        return {
          email: u?.email || null,
          firstName: u?.firstName || null,
          lastName: u?.lastName || null,
          avatar: u?.avatar || null,
          role: p.role,
          pending: false
        }
      }),
      ...objInvites.map(i => ({
        email: i.email,
        firstName: null,
        lastName: null,
        avatar: null,
        role: i.role,
        pending: true
      }))
    ]

    results.push({ objectId, objectType, name, ext, starred, sizeBytes, blobKey, mimeType, modifiedAt, createdAt, sharedWith })
  }

  return results
})
