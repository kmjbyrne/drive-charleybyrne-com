<script setup lang="ts">
definePageMeta({ layout: false })

const { login } = useAuth()

onMounted(() => {
  login()
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div class="text-center">
      <UIcon
        name="i-lucide-loader-2"
        class="size-8 animate-spin text-green-500"
      />
      <p class="mt-2 text-sm text-slate-500">
        Redirecting to sign in...
      </p>
    </div>
  </div>
</template>
