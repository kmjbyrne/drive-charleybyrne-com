import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { JWTPayload } from 'jose'
import type { H3Event } from 'h3'

// How long the access token cookie lives before the browser discards it.
// The JWT itself also expires after 1 hour on the Janus side, so this
// just keeps the cookie in sync. After this window the user needs to
// refresh or re-login.
export const ACCESS_TOKEN_MAX_AGE = 60 * 60 // 1 hour in seconds

// How long a refresh token stays valid. While this cookie exists the app
// can silently obtain a new access token without sending the user back to
// the login page. After 14 days of inactivity the user must log in again.
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 14 // 14 days in seconds

export interface JanusUser {
  sub: string
  email: string
  firstName: string
  lastName: string
  avatar: string | null
  tid: string
  permissions: string[]
}

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
  if (_jwks) return _jwks

  const config = useRuntimeConfig()
  const base = config.janus.url.endsWith('/') ? config.janus.url : `${config.janus.url}/`
  const jwksUrl = new URL('public/.well-known/jwks.json', base)
  _jwks = createRemoteJWKSet(jwksUrl)
  return _jwks
}

export async function verifyToken(token: string): Promise<JanusUser | null> {
  const config = useRuntimeConfig()

  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: 'janus',
      audience: config.janus.appIdentifier
    })

    return mapPayloadToUser(payload)
  } catch (err) {
    console.error('[auth] JWT verification failed:', (err as Error).message)

    return null
  }
}

function mapPayloadToUser(payload: JWTPayload): JanusUser {
  return {
    sub: payload.sub as string,
    email: (payload as Record<string, unknown>).email as string,
    firstName: (payload as Record<string, unknown>).first_name as string,
    lastName: (payload as Record<string, unknown>).last_name as string,
    avatar: ((payload as Record<string, unknown>).avatar as string) || null,
    tid: (payload as Record<string, unknown>).tid as string,
    permissions: ((payload as Record<string, unknown>).permissions as string[]) || []
  }
}

const DEV_USER: JanusUser = {
  sub: 'dev-user',
  email: 'dev@localhost',
  firstName: 'Dev',
  lastName: 'User',
  avatar: null,
  tid: 'dev-tenant',
  permissions: []
}

export async function getUserFromRequest(event: H3Event): Promise<JanusUser | null> {
  const config = useRuntimeConfig()
  if (config.authBypass && process.env.NODE_ENV !== 'production') return DEV_USER

  // Prefer an explicit Authorization header (used by SSR after a refresh)
  // over the cookie, since the cookie on the incoming request may be stale.
  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : getCookie(event, 'accessToken')

  if (!token) return null
  return verifyToken(token)
}

export async function requireAuth(event: H3Event): Promise<JanusUser> {
  const user = await getUserFromRequest(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  return user
}
