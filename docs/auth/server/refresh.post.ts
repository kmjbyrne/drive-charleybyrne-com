// server/api/auth/refresh.post.ts
//
// Exchanges the refresh token cookie for a fresh access token and a
// rotated refresh token. Called automatically by the useAuth composable
// when the access token expires.

import { ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE } from '../../app/auth'

export default defineEventHandler(async (event) => {
  const refreshToken = getCookie(event, 'refreshToken')
  if (!refreshToken) {
    throw createError({ statusCode: 401, message: 'No refresh token' })
  }

  const config = useRuntimeConfig()

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
  } catch {
    deleteCookie(event, 'accessToken', { path: '/' })
    deleteCookie(event, 'refreshToken', { path: '/' })
    throw createError({ statusCode: 401, message: 'Refresh failed' })
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

  return { ok: true }
})
