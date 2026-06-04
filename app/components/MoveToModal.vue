<script setup lang="ts">
import type { ApiFileEntry, ApiSpace } from '~/composables/useStorage'

const props = defineProps<{
  spaces: ApiSpace[]
}>()

const emit = defineEmits<{
  move: [parentId: string | null, spaceId: string]
}>()

const open = ref(false)
const selectedSpaceId = ref<string | null>(null)
const currentParentId = ref<string | null>(null)
const folders = ref<ApiFileEntry[]>([])
const loading = ref(false)
const trail = ref<{ id: string | null, name: string }[]>([])

async function fetchFolders() {
  if (!selectedSpaceId.value) {
    folders.value = []
    return
  }
  loading.value = true
  try {
    const all = await $fetch<ApiFileEntry[]>('/api/storage/files', {
      query: {
        spaceId: selectedSpaceId.value,
        parentId: currentParentId.value || ''
      }
    })
    folders.value = all.filter(f => f.type === 'folder')
  } catch {
    folders.value = []
  } finally {
    loading.value = false
  }
}

function show() {
  open.value = true
  selectedSpaceId.value = props.spaces[0]?.id ?? null
  currentParentId.value = null
  trail.value = []
  fetchFolders()
}

function selectSpace(spaceId: string) {
  selectedSpaceId.value = spaceId
  currentParentId.value = null
  trail.value = []
  fetchFolders()
}

function enterFolder(folder: ApiFileEntry) {
  trail.value.push({ id: currentParentId.value, name: folder.name })
  currentParentId.value = folder.id
  fetchFolders()
}

function goBack() {
  const prev = trail.value.pop()
  currentParentId.value = prev?.id ?? null
  fetchFolders()
}

function goToRoot() {
  trail.value = []
  currentParentId.value = null
  fetchFolders()
}

function confirm() {
  if (!selectedSpaceId.value) return
  emit('move', currentParentId.value, selectedSpaceId.value)
  open.value = false
}

defineExpose({ show })
</script>

<template>
  <UModal
    v-model:open="open"
    title="Move to..."
    description="Choose a destination folder."
  >
    <template #body>
      <div class="space-y-3">
        <!-- Space selector -->
        <div class="flex gap-1.5 flex-wrap">
          <button
            v-for="space in spaces"
            :key="space.id"
            :class="[
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
              selectedSpaceId === space.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted hover:bg-elevated'
            ]"
            @click="selectSpace(space.id)"
          >
            <span
              class="size-2 rounded-sm shrink-0"
              :style="{ background: space.color }"
            />
            {{ space.name }}
          </button>
        </div>

        <!-- Breadcrumb -->
        <div
          v-if="trail.length > 0"
          class="flex items-center gap-1 text-xs text-muted"
        >
          <button
            class="hover:text-default transition-colors"
            @click="goToRoot()"
          >
            Root
          </button>
          <template
            v-for="(crumb, i) in trail"
            :key="i"
          >
            <UIcon
              name="i-lucide-chevron-right"
              class="size-3"
            />
            <span class="text-default">{{ crumb.name }}</span>
          </template>
        </div>

        <!-- Folder list -->
        <div class="border border-default rounded-lg max-h-64 overflow-auto">
          <button
            v-if="trail.length > 0"
            class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-muted hover:bg-elevated transition-colors"
            @click="goBack()"
          >
            <UIcon
              name="i-lucide-arrow-left"
              class="size-4"
            />
            Back
          </button>

          <div
            v-if="loading"
            class="p-4 text-center text-xs text-dimmed"
          >
            Loading...
          </div>

          <div
            v-else-if="folders.length === 0"
            class="p-4 text-center text-xs text-dimmed"
          >
            No subfolders here
          </div>

          <button
            v-for="folder in folders"
            :key="folder.id"
            class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-default hover:bg-elevated transition-colors"
            @click="enterFolder(folder)"
          >
            <UIcon
              name="i-lucide-folder"
              class="size-4 text-muted"
            />
            {{ folder.name }}
          </button>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          variant="ghost"
          color="neutral"
          @click="open = false"
        />
        <UButton
          label="Move here"
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>
