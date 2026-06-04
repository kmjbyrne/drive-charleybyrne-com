<script setup lang="ts">
import type { ApiFileEntry } from '~/composables/useStorage'

const props = defineProps<{
  file: ApiFileEntry
}>()

interface Metadata {
  title: string | null
  artist: string | null
  album: string | null
  year: number | null
  trackNumber: number | null
  trackTotal: number | null
  genre: string | null
  albumArt: string | null
  duration: number | null
  bitrate: number | null
  sampleRate: number | null
  codec: string | null
  fileSize: number
}

const metadata = ref<Metadata | null>(null)
const loading = ref(true)
const editing = ref(false)
const saving = ref(false)

const form = ref({
  title: '',
  artist: '',
  album: '',
  year: null as number | null,
  trackNumber: null as number | null,
  genre: ''
})

const isMp3 = computed(() => props.file.ext?.toLowerCase() === '.mp3')

async function fetchMetadata() {
  loading.value = true
  try {
    metadata.value = await $fetch<Metadata>(`/api/storage/files/${props.file.id}/metadata`)
  } catch {
    metadata.value = null
  } finally {
    loading.value = false
  }
}

function startEdit() {
  if (!metadata.value) return
  form.value = {
    title: metadata.value.title || '',
    artist: metadata.value.artist || '',
    album: metadata.value.album || '',
    year: metadata.value.year,
    trackNumber: metadata.value.trackNumber,
    genre: metadata.value.genre || ''
  }
  editing.value = true
}

async function saveMetadata() {
  saving.value = true
  try {
    await $fetch(`/api/storage/files/${props.file.id}/metadata`, {
      method: 'PUT',
      body: {
        title: form.value.title || null,
        artist: form.value.artist || null,
        album: form.value.album || null,
        year: form.value.year,
        trackNumber: form.value.trackNumber,
        genre: form.value.genre || null
      }
    })
    editing.value = false
    await fetchMetadata()
  } catch (e) {
    console.error('Failed to save metadata:', e)
  } finally {
    saving.value = false
  }
}

function cancelEdit() {
  editing.value = false
}

function formatBitrate(kbps: number | null): string {
  if (!kbps) return '--'
  return `${kbps} kbps`
}

function formatSampleRate(hz: number | null): string {
  if (!hz) return '--'
  return `${(hz / 1000).toFixed(1)} kHz`
}

watch(() => props.file.id, () => {
  editing.value = false
  fetchMetadata()
}, { immediate: true })

defineExpose({ startEdit })
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Loading -->
    <div
      v-if="loading"
      class="flex items-center justify-center py-4"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-4 text-muted animate-spin"
      />
    </div>

    <template v-else-if="metadata">
      <!-- Album art -->
      <div
        v-if="metadata.albumArt"
        class="flex justify-center"
      >
        <img
          :src="metadata.albumArt"
          alt="Album art"
          class="size-32 rounded-lg object-cover shadow-md"
        >
      </div>

      <!-- Edit form -->
      <template v-if="editing">
        <div class="space-y-2.5">
          <UFormField label="Title" size="sm">
            <UInput
              v-model="form.title"
              placeholder="Track title"
              size="sm"
            />
          </UFormField>
          <UFormField label="Artist" size="sm">
            <UInput
              v-model="form.artist"
              placeholder="Artist name"
              size="sm"
            />
          </UFormField>
          <UFormField label="Album" size="sm">
            <UInput
              v-model="form.album"
              placeholder="Album name"
              size="sm"
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-2">
            <UFormField label="Year" size="sm">
              <UInput
                v-model.number="form.year"
                type="number"
                placeholder="2024"
                size="sm"
              />
            </UFormField>
            <UFormField label="Track #" size="sm">
              <UInput
                v-model.number="form.trackNumber"
                type="number"
                placeholder="1"
                size="sm"
              />
            </UFormField>
          </div>
          <UFormField label="Genre" size="sm">
            <UInput
              v-model="form.genre"
              placeholder="Genre"
              size="sm"
            />
          </UFormField>
          <div class="flex gap-2 pt-1">
            <UButton
              label="Save"
              size="xs"
              :loading="saving"
              @click="saveMetadata"
            />
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              size="xs"
              @click="cancelEdit"
            />
          </div>
        </div>
      </template>

      <!-- Read-only display -->
      <template v-else>
        <div class="space-y-1.5 text-xs">
          <div
            v-if="metadata.title"
            class="flex justify-between gap-2"
          >
            <span class="text-muted shrink-0">Title</span>
            <span class="text-default text-right truncate">{{ metadata.title }}</span>
          </div>
          <div
            v-if="metadata.artist"
            class="flex justify-between gap-2"
          >
            <span class="text-muted shrink-0">Artist</span>
            <span class="text-default text-right truncate">{{ metadata.artist }}</span>
          </div>
          <div
            v-if="metadata.album"
            class="flex justify-between gap-2"
          >
            <span class="text-muted shrink-0">Album</span>
            <span class="text-default text-right truncate">{{ metadata.album }}</span>
          </div>
          <div
            v-if="metadata.year"
            class="flex justify-between gap-2"
          >
            <span class="text-muted shrink-0">Year</span>
            <span class="text-default">{{ metadata.year }}</span>
          </div>
          <div
            v-if="metadata.trackNumber"
            class="flex justify-between gap-2"
          >
            <span class="text-muted shrink-0">Track</span>
            <span class="text-default">
              {{ metadata.trackNumber }}{{ metadata.trackTotal ? ` / ${metadata.trackTotal}` : '' }}
            </span>
          </div>
          <div
            v-if="metadata.genre"
            class="flex justify-between gap-2"
          >
            <span class="text-muted shrink-0">Genre</span>
            <span class="text-default">{{ metadata.genre }}</span>
          </div>

          <!-- Technical info -->
          <div class="border-t border-default pt-1.5 mt-2 space-y-1.5">
            <div
              v-if="metadata.codec"
              class="flex justify-between gap-2"
            >
              <span class="text-muted shrink-0">Codec</span>
              <span class="text-default font-mono">{{ metadata.codec }}</span>
            </div>
            <div
              v-if="metadata.bitrate"
              class="flex justify-between gap-2"
            >
              <span class="text-muted shrink-0">Bitrate</span>
              <span class="text-default font-mono">{{ formatBitrate(metadata.bitrate) }}</span>
            </div>
            <div
              v-if="metadata.sampleRate"
              class="flex justify-between gap-2"
            >
              <span class="text-muted shrink-0">Sample rate</span>
              <span class="text-default font-mono">{{ formatSampleRate(metadata.sampleRate) }}</span>
            </div>
          </div>

          <!-- Edit button (MP3 only) -->
          <UButton
            v-if="isMp3"
            icon="i-lucide-pencil"
            label="Edit metadata"
            variant="outline"
            color="neutral"
            size="xs"
            block
            class="mt-2"
            @click="startEdit"
          />
        </div>
      </template>
    </template>

    <!-- No metadata -->
    <div
      v-else
      class="text-xs text-muted text-center py-2"
    >
      No metadata available
    </div>
  </div>
</template>
