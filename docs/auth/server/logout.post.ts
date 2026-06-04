// server/api/auth/logout.post.ts
//
// Clears both the access token and refresh token cookies.

export default defineEventHandler((event) => {
  deleteCookie(event, 'accessToken', { path: '/' })
  deleteCookie(event, 'refreshToken', { path: '/' })
  return { ok: true }
})
