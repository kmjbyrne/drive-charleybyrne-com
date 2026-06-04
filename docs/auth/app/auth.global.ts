// app/middleware/auth.global.ts
//
// Global route middleware that protects all pages except public auth
// routes. If the user session has expired, it attempts a silent refresh
// before redirecting to login.

export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, fetchUser } = useAuth()

  const publicPaths = ['/auth/login', '/auth/callback', '/auth/logout']
  if (publicPaths.some(p => to.path.startsWith(p))) {
    return
  }

  if (!loggedIn.value) {
    await fetchUser()
  }

  if (!loggedIn.value) {
    return navigateTo('/auth/login')
  }
})
