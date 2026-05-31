import { z } from 'zod'
import { decodeJwt } from 'jose'
import { container } from '../../app/container'

const bodySchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url()
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)
  const config = useRuntimeConfig()

  let response: { access_token: string }
  try {
    // Exchange the auth code for a JWT via Janus /v1/oauth/token
    response = await $fetch<{ access_token: string }>(`${config.janus.url}/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        grant_type: 'authorization_code',
        code: body.code,
        client_id: config.janus.clientId,
        client_secret: config.janus.clientSecret,
        redirect_uri: body.redirectUri
      }
    })
  } catch {
    throw createError({ statusCode: 401, message: 'Token exchange failed' })
  }

  if (!response.access_token) {
    console.error('[auth/callback] No access_token in response. Keys:', Object.keys(response))
    throw createError({ statusCode: 401, message: 'No access token received' })
  }

  console.log('[auth/callback] Token received, length:', response.access_token.length)

  // Sync user to local database for sharing lookups
  try {
    const claims = decodeJwt(response.access_token) as Record<string, unknown>
    const userId = claims.sub as string
    const userEmail = (claims.email as string || '').toLowerCase()

    await container.userRepo.upsert({
      id: userId,
      email: claims.email as string,
      firstName: claims.first_name as string,
      lastName: claims.last_name as string,
      avatar: (claims.avatar as string) || null,
      tid: claims.tid as string,
      lastSeenAt: new Date()
    })

    // Resolve any pending share invites for this email
    if (userEmail) {
      const invites = await container.shareInviteRepo.listByEmail(userEmail)
      for (const invite of invites) {
        await container.permissionService.grant({
          objectId: invite.objectId,
          objectType: invite.objectType,
          subjectId: userId,
          role: invite.role,
          grantedBy: invite.grantedBy
        })
        await container.shareInviteRepo.delete(invite.id)
      }
      if (invites.length > 0) {
        console.info(`[auth/callback] Resolved ${invites.length} pending invite(s) for ${userEmail}`)
      }
    }
  } catch (err) {
    console.warn('[auth/callback] User sync failed:', (err as Error).message)
  }

  // Set the JWT as an httpOnly cookie
  setCookie(event, 'auth-token', response.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    // 1 hour to match Janus JWT expiry
    maxAge: 60 * 60,
    path: '/'
  })

  return { ok: true }
})
