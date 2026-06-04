// server/api/auth/callback.post.ts
//
// Handles the OAuth callback. The frontend POSTs the authorization code
// here, the server exchanges it with Janus for tokens, then sets httpOnly
// cookies for both the access token and the refresh token.

import { ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE } from '../../app/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const config = useRuntimeConfig()

  const response = await $fetch<{
    access_token: string
    refresh_token?: string
  }>(`${config.janus.url}/v1/oauth/token`, {
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

  if (!response.access_token) {
    throw createError({ statusCode: 401, message: 'No access token' })
  }

  setCookie(event, 'accessToken', response.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ACCESS_TOKEN_MAX_AGE,
    path: '/'
  })

  if (response.refresh_token) {
    setCookie(event, 'refreshToken', response.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: '/'
    })
  }

  return { ok: true }
})
