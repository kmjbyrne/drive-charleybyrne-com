export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  deleteCookie(event, 'auth-token', { path: '/' })
  return {
    ok: true,
    authBypass: config.authBypass && process.env.NODE_ENV !== 'production'
  }
})
