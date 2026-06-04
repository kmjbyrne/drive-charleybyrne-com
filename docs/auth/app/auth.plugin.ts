// app/plugins/auth.ts
//
// Nuxt plugin that hydrates the user state on app startup. On the
// server this runs synchronously so SSR has access to the user. On the
// client it runs in the background to avoid blocking hydration.

export default defineNuxtPlugin(async () => {
  const { fetchUser } = useAuth()

  if (import.meta.server) {
    await fetchUser()
  } else {
    fetchUser()
  }
})
