<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()

const { user } = useAuth()

const workspaceLabel = computed(() => {
  if (!user.value) return 'Storage'
  return `${user.value.firstName}'s workspace`
})
</script>

<template>
  <div class="flex items-center gap-2.5">
    <div
      class="size-7 rounded-lg bg-primary text-primary-inverted flex items-center justify-center font-extrabold text-sm tracking-tight shrink-0"
    >
      S
    </div>
    <div
      v-if="!collapsed"
      class="min-w-0"
    >
      <div class="text-sm font-bold text-default truncate">
        Storage
      </div>
      <div class="text-xs text-muted truncate">
        {{ workspaceLabel }}
      </div>
    </div>
  </div>
</template>
