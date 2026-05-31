export default defineNuxtPlugin(async () => {
  const { fetchUser } = useAuth()

  // On the server, await so SSR has the user state for middleware
  // On the client, fetch in background to avoid blocking hydration
  if (import.meta.server) {
    await fetchUser()
  } else {
    fetchUser()
  }
})
