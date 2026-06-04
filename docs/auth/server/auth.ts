// server/app/auth.ts
//
// Core auth utilities for verifying Janus JWTs and extracting user
// identity from incoming requests. Drop this file into any Nuxt server
// app that needs to authenticate against Janus.

import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { JWTPayload } from 'jose'
import type { H3Event } from 'h3'

export interface JanusUser {
  sub: string
  email: string
  firstName: string
  lastName: string
  avatar: string | null
  tid: string
  permissions: string[]
}

// How long the access token cookie lives before the browser discards it.
// The JWT itself also expires after 1 hour on the Janus side, so this
// just keeps the cookie in sync. After this window the user needs to
// refresh or re-login.
export const ACCESS_TOKEN_MAX_AGE = 60 * 60 // 1 hour in seconds

// How long a refresh token stays valid. While this cookie exists the app
// can silently obtain a new access token without sending the user back to
// the login page. After 14 days of inactivity the user must log in again.
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 14 // 14 days in seconds

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
  if (_jwks) return _jwks

  const config = useRuntimeConfig()
  const base = config.janus.url.endsWith('/')
    ? config.janus.url
    : `${config.janus.url}/`
  const jwksUrl = new URL('public/.well-known/jwks.json', base)
  _jwks = createRemoteJWKSet(jwksUrl)
  return _jwks
}

export async function verifyToken(
  token: string
): Promise<JanusUser | null> {
  const config = useRuntimeConfig()
  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: 'janus',
      audience: config.janus.appIdentifier
    })
    return mapPayloadToUser(payload)
  } catch {
    return null
  }
}

function mapPayloadToUser(payload: JWTPayload): JanusUser {
  const p = payload as Record<string, unknown>
  return {
    sub: payload.sub as string,
    email: p.email as string,
    firstName: p.first_name as string,
    lastName: p.last_name as string,
    avatar: (p.avatar as string) || null,
    tid: p.tid as string,
    permissions: (p.permissions as string[]) || []
  }
}

export async function getUserFromRequest(
  event: H3Event
): Promise<JanusUser | null> {
  const token = getCookie(event, 'accessToken')
  if (!token) return null
  return verifyToken(token)
}

export async function requireAuth(
  event: H3Event
): Promise<JanusUser> {
  const user = await getUserFromRequest(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  return user
}
