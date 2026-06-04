import { container } from '../../app/container'
import { requireAuth } from '../../app/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Get direct permissions + pending invites for this user's email
  const [permissions, invites] = await Promise.all([
    container.permissionService.listBySubject(user.sub),
    container.shareInviteRepo.listByEmail(user.email.toLowerCase())
  ])

  // Track which objectIds we've already added from direct permissions
  const seen = new Set<string>()
  const results = []

  for (const perm of permissions) {
    let name = perm.objectId
    let ext: string | null = null
    let starred = false
    let sizeBytes = 0
    let blobKey: string | null = null
    let mimeType: string | null = null
    let modifiedAt: string = ''
    let createdAt: string = ''
    let objectType = perm.objectType
    let skip = false

    if (perm.objectType === 'space') {
      const space = await container.catalogRepo.getSpace(perm.objectId)
      if (!space || space.ownerId === user.sub) {
        skip = true
      } else {
        name = space.name
      }
    } else {
      const entry = await container.catalogRepo.getEntry(perm.objectId)
      if (!entry || entry.ownerId === user.sub) {
        skip = true
      } else {
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

    if (skip) continue

    seen.add(perm.objectId)

    // Resolve who shared it
    let sharedBy = null
    if (perm.grantedBy) {
      const granters = await container.userRepo.getByIds([perm.grantedBy])
      const granter = granters[0]
      if (granter) {
        sharedBy = {
          id: granter.id,
          email: granter.email,
          firstName: granter.firstName,
          lastName: granter.lastName,
          avatar: granter.avatar
        }
      }
    }

    results.push({
      id: perm.objectId,
      parentId: null,
      spaceId: '',
      name,
      type: objectType === 'folder' ? 'folder' : objectType === 'space' ? 'folder' : 'file',
      mimeType,
      ext,
      sizeBytes,
      blobKey,
      ownerId: '',
      starred,
      trashedAt: null,
      createdAt,
      modifiedAt,
      role: perm.role,
      sharedBy
    })
  }

  // Auto-convert pending invites to real permissions now that the user is
  // authenticated. This handles the case where the invite was created due to
  // email case mismatch or the user wasn't registered at share time.
  for (const invite of invites) {
    if (seen.has(invite.objectId)) continue

    await container.permissionService.grant({
      objectId: invite.objectId,
      objectType: invite.objectType,
      subjectId: user.sub,
      role: invite.role,
      grantedBy: invite.grantedBy
    })
    await container.shareInviteRepo.delete(invite.id)

    let name = invite.objectId
    let ext: string | null = null
    let sizeBytes = 0
    let blobKey: string | null = null
    let mimeType: string | null = null
    let modifiedAt: string = ''
    let createdAt: string = ''
    let objectType = invite.objectType

    if (invite.objectType === 'space') {
      const space = await container.catalogRepo.getSpace(invite.objectId)
      if (space) name = space.name
    } else {
      const entry = await container.catalogRepo.getEntry(invite.objectId)
      if (entry) {
        name = entry.name
        ext = entry.ext
        sizeBytes = entry.sizeBytes
        blobKey = entry.blobKey
        mimeType = entry.mimeType
        modifiedAt = entry.modifiedAt ? new Date(entry.modifiedAt).toISOString() : ''
        createdAt = entry.createdAt ? new Date(entry.createdAt).toISOString() : ''
        objectType = entry.type === 'folder' ? 'folder' : 'file'
      }
    }

    // Resolve who shared it
    let sharedBy = null
    const granters = await container.userRepo.getByIds([invite.grantedBy])
    const granter = granters[0]
    if (granter) {
      sharedBy = {
        id: granter.id,
        email: granter.email,
        firstName: granter.firstName,
        lastName: granter.lastName,
        avatar: granter.avatar
      }
    }

    results.push({
      id: invite.objectId,
      parentId: null,
      spaceId: '',
      name,
      type: objectType === 'folder' ? 'folder' : objectType === 'space' ? 'folder' : 'file',
      mimeType,
      ext,
      sizeBytes,
      blobKey,
      ownerId: '',
      starred: false,
      trashedAt: null,
      createdAt,
      modifiedAt,
      role: invite.role,
      sharedBy
    })
  }

  return results
})
