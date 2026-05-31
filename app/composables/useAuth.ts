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
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}
      user.value = await $fetch('/api/auth/me', { headers })
    } catch {
      user.value = null
    }
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
