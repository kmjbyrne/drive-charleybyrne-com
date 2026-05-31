<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()
const { fetchUser } = useAuth()
const error = ref<string | null>(null)

onMounted(async () => {
  const code = route.query.code as string
  if (!code) {
    error.value = 'No authorization code received'
    return
  }

  try {
    await $fetch('/api/auth/callback', {
      method: 'POST',
      body: {
        code,
        redirectUri: `${config.public.appUrl}/auth/callback`
      }
    })
    await fetchUser()
    navigateTo('/home')
  } catch {
    error.value = 'Authentication failed. Please try again.'
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div
      v-if="error"
      class="text-center"
    >
      <p class="text-red-500">
        {{ error }}
      </p>
      <UButton
        class="mt-4"
        @click="navigateTo('/auth/login')"
      >
        Try again
      </UButton>
    </div>
    <div
      v-else
      class="text-center"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-8 animate-spin text-green-500"
      />
      <p class="mt-2 text-sm text-slate-500">
        Signing you in...
      </p>
    </div>
  </div>
</template>
