import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose'
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
    const start = performance.now()
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: 'janus',
      audience: config.janus.appIdentifier
    })
    console.log('[auth] JWT verified in', Math.round(performance.now() - start), 'ms')

    return mapPayloadToUser(payload)
  } catch (err) {
    console.error('[auth] JWT verification failed:', (err as Error).message)
    console.error('[auth] Expected audience:', config.janus.appIdentifier)
    try {
      const claims = decodeJwt(token)
      console.error('[auth] Actual audience in token:', claims.aud)
    } catch { /* ignore decode errors */ }

    // Debug JWKS endpoint
    try {
      const base = config.janus.url.endsWith('/') ? config.janus.url : `${config.janus.url}/`
      const jwksUrl = new URL('public/.well-known/jwks.json', base).toString()
      console.error('[auth] Fetching JWKS from:', jwksUrl)
      console.error('[auth] JANUS_URL config:', config.janus.url)
      const res = await fetch(jwksUrl)
      const text = await res.text()
      console.error('[auth] JWKS response status:', res.status)
      console.error('[auth] JWKS response content-type:', res.headers.get('content-type'))
      console.error('[auth] JWKS response body (first 500 chars):', text.substring(0, 500))
    } catch (fetchErr) {
      console.error('[auth] JWKS fetch error:', (fetchErr as Error).message)
    }

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

  const token = getCookie(event, 'auth-token')
  if (!token) {
    console.warn('[auth] No auth-token cookie found on request')
    return null
  }
  console.log('[auth] Token found, verifying... (length:', token.length, ')')
  return verifyToken(token)
}

export async function requireAuth(event: H3Event): Promise<JanusUser> {
  const user = await getUserFromRequest(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  return user
}
