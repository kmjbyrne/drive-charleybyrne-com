// app/composables/useAuth.ts
//
// Client-side composable that manages authentication state. Provides
// reactive user object, login/logout actions, and automatic silent
// refresh when the access token expires.

interface AuthUser {
  sub: string
  email: string
  firstName: string
  lastName: string
  avatar: string | null
  tid: string
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const loggedIn = computed(() => !!user.value)
  const config = useRuntimeConfig()

  async function fetchUser() {
    try {
      const headers = import.meta.server
        ? useRequestHeaders(['cookie'])
        : {}
      user.value = await $fetch('/api/auth/me', { headers })
    } catch {
      // Access token may have expired — try refreshing it
      const refreshed = await tryRefresh()
      if (refreshed) {
        try {
          const headers = import.meta.server
            ? useRequestHeaders(['cookie'])
            : {}
          user.value = await $fetch('/api/auth/me', { headers })
        } catch {
          user.value = null
        }
      } else {
        user.value = null
      }
    }
  }

  async function tryRefresh(): Promise<boolean> {
    try {
      const headers = import.meta.server
        ? useRequestHeaders(['cookie'])
        : {}
      await $fetch('/api/auth/refresh', { method: 'POST', headers })
      return true
    } catch {
      return false
    }
  }

  function login() {
    const redirectUri = `${config.public.appUrl}/auth/callback`
    const params = new URLSearchParams({
      client_id: config.public.janusClientId,
      redirect_uri: redirectUri
    })
    navigateTo(
      `${config.public.janusUiUrl}?${params.toString()}`,
      { external: true }
    )
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    navigateTo('/auth/login')
  }

  return { user, loggedIn, fetchUser, login, logout }
}
