export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useAuth()

  const publicPaths = ['/auth/login', '/auth/callback', '/auth/logout']
  if (publicPaths.some(p => to.path.startsWith(p))) {
    return
  }

  if (!loggedIn.value) {
    return navigateTo('/auth/login')
  }
})
