import { ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE } from '../../app/auth'

// Cache recent refresh results keyed by the old refresh token value.
// After token rotation the old token is revoked, so if a second SSR
// request arrives with the same cookie a few seconds later, we serve
// the cached result instead of hitting Janus again (which would trigger
// replay detection and revoke everything).
const recentRefreshes = new Map<string, { result: { access_token: string, refresh_token: string }, expiresAt: number }>()

export default defineEventHandler(async (event) => {
  const refreshToken = getCookie(event, 'refreshToken')
  if (!refreshToken) {
    throw createError({ statusCode: 401, message: 'No refresh token' })
  }

  const config = useRuntimeConfig()

  // Check if we already refreshed this token recently (handles the case
  // where a second SSR request arrives with the same old cookie)
  const cached = recentRefreshes.get(refreshToken)
  if (cached && cached.expiresAt > Date.now()) {
    const response = cached.result
    setCookie(event, 'accessToken', response.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_MAX_AGE,
      path: '/'
    })
    setCookie(event, 'refreshToken', response.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: '/'
    })
    return { ok: true, accessToken: response.access_token }
  }

  let response: { access_token: string, refresh_token: string }
  try {
    response = await $fetch<{ access_token: string, refresh_token: string }>(
      `${config.janus.url}/v1/oauth/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.janus.clientId,
          client_secret: config.janus.clientSecret
        }
      }
    )
  } catch (err) {
    console.error('[auth/refresh] Janus refresh failed:', (err as Error).message)
    deleteCookie(event, 'accessToken', { path: '/' })
    deleteCookie(event, 'refreshToken', { path: '/' })
    throw createError({ statusCode: 401, message: 'Refresh failed' })
  }

  // Cache the result for 30 seconds so duplicate SSR requests don't
  // trigger token rotation replay detection
  recentRefreshes.set(refreshToken, {
    result: response,
    expiresAt: Date.now() + 30_000
  })
  // Clean up old entries
  for (const [key, entry] of recentRefreshes) {
    if (entry.expiresAt < Date.now()) recentRefreshes.delete(key)
  }

  setCookie(event, 'accessToken', response.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE,
    path: '/'
  })

  setCookie(event, 'refreshToken', response.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/'
  })

  return { ok: true, accessToken: response.access_token }
})
