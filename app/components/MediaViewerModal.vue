<script setup lang="ts">
import type { ApiFileEntry } from '~/composables/useStorage'

const file = defineModel<ApiFileEntry | null>('file', { default: null })

function viewerUrl(entry: ApiFileEntry): string | null {
  if (!entry.blobKey) return null
  return `/api/storage/download?key=${encodeURIComponent(entry.blobKey)}`
}

function mediaType(entry: ApiFileEntry): 'video' | 'audio' | 'image' {
  const ext = entry.ext?.toLowerCase() || ''
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) return 'video'
  if (['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'].includes(ext))
    return 'audio'
  return 'image'
}
</script>

<template>
  <UModal
    :open="!!file"
    :title="file ? `${file.name}${file.ext || ''}` : ''"
    :ui="{ content: 'sm:max-w-4xl' }"
    @update:open="file = null"
  >
    <template #body>
      <div
        v-if="file"
        class="flex items-center justify-center"
      >
        <video
          v-if="mediaType(file) === 'video'"
          :src="viewerUrl(file)!"
          controls
          autoplay
          class="w-full rounded-lg max-h-[70vh]"
        />
        <audio
          v-else-if="mediaType(file) === 'audio'"
          :src="viewerUrl(file)!"
          controls
          autoplay
          class="w-full"
        />
        <img
          v-else
          :src="viewerUrl(file)!"
          :alt="file.name"
          class="max-w-full max-h-[70vh] rounded-lg object-contain"
        >
      </div>
    </template>
  </UModal>
</template>
