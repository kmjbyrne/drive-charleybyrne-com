<script setup lang="ts">
definePageMeta({ layout: false })

const { fetchUser } = useAuth()

async function handleLogin() {
  await fetchUser()
  navigateTo('/')
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div class="text-center space-y-4">
      <UIcon
        name="i-lucide-log-out"
        class="size-10 text-slate-400"
      />
      <p class="text-sm text-slate-500">
        You have been signed out.
      </p>
      <UButton
        label="Sign back in"
        icon="i-lucide-log-in"
        @click="handleLogin"
      />
    </div>
  </div>
</template>
