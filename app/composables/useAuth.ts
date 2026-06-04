interface AuthUser {
  sub: string
  email: string
  firstName: string
  lastName: string
  avatar: string | null
  tid: string
}

// Deduplicates concurrent refresh attempts so token rotation doesn't
// trigger replay detection when multiple SSR requests refresh at once.
let refreshPromise: Promise<string | null> | null = null

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const loggedIn = computed(() => !!user.value)
  const config = useRuntimeConfig()

  async function fetchUser() {
    // Capture SSR headers upfront before any async work, otherwise the
    // Nuxt composable context is lost after the first await.
    const ssrHeaders = import.meta.server
      ? useRequestHeaders(['cookie'])
      : {}

    try {
      user.value = await $fetch('/api/auth/me', { headers: ssrHeaders })
    } catch {
      // Access token may have expired — try refreshing it
      const freshToken = await tryRefresh(ssrHeaders)
      if (freshToken) {
        try {
          // During SSR the new cookie isn't on the incoming request yet,
          // so pass the fresh token explicitly via Authorization header.
          const headers = import.meta.server
            ? { ...ssrHeaders, authorization: `Bearer ${freshToken}` }
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

  async function tryRefresh(headers: Record<string, string> = {}): Promise<string | null> {
    // If a refresh is already in flight, wait for it instead of firing another
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      try {
        const res = await $fetch<{ ok: boolean, accessToken: string }>('/api/auth/refresh', { method: 'POST', headers })
        return res.accessToken || null
      } catch {
        return null
      } finally {
        refreshPromise = null
      }
    })()

    return refreshPromise
  }

  function login() {
    const redirectUri = `${config.public.appUrl}/auth/callback`
    const params = new URLSearchParams({
      client_id: config.public.janusClientId,
      redirect_uri: redirectUri
    })
    navigateTo(`${config.public.janusUiUrl}?${params.toString()}`, { external: true })
  }

  async function logout() {
    const res = await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    if (res.authBypass) {
      navigateTo('/auth/logout')
    } else {
      navigateTo('/auth/login')
    }
  }

  return {
    user,
    loggedIn,
    fetchUser,
    login,
    logout
  }
}
