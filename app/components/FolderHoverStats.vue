<script setup lang="ts">
defineProps<{
  visible: boolean
  loading: boolean
  stats: { files: number, folders: number } | null
}>()
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 translate-y-1"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-1"
  >
    <div
      v-if="visible"
      class="absolute z-50 bottom-full mb-1 left-3 px-2.5 py-1.5 rounded-md bg-inverted text-inverted text-xs shadow-lg whitespace-nowrap pointer-events-none"
    >
      <template v-if="loading">
        <span class="opacity-60">Loading...</span>
      </template>
      <template v-else-if="stats">
        <span>{{ stats.folders }} {{ stats.folders === 1 ? 'folder' : 'folders' }}, {{ stats.files }} {{ stats.files === 1 ? 'file' : 'files' }}</span>
      </template>
    </div>
  </Transition>
</template>
