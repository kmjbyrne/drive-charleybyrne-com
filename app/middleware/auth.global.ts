export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, fetchUser } = useAuth()

  const publicPaths = ['/auth/login', '/auth/callback', '/auth/logout']
  if (publicPaths.some(p => to.path.startsWith(p))) {
    return
  }

  // If not logged in, attempt a refresh before giving up.
  // fetchUser already tries the refresh internally, so one call is enough.
  if (!loggedIn.value) {
    await fetchUser()
  }

  if (!loggedIn.value) {
    return navigateTo('/auth/login')
  }
})
