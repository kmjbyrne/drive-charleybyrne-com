export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  deleteCookie(event, 'accessToken', { path: '/' })
  deleteCookie(event, 'refreshToken', { path: '/' })
  return {
    ok: true,
    authBypass: config.authBypass && process.env.NODE_ENV !== 'production'
  }
})
