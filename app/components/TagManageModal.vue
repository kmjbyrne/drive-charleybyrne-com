<script setup lang="ts">
import type { ApiFileEntry, ApiTag } from '~/composables/useStorage'

defineProps<{
  tags: ApiTag[]
}>()

defineEmits<{
  (e: 'tag' | 'untag', fileId: string, tagId: string): void
  (e: 'create-tag', label: string, color: string): Promise<void>
}>()

const { getFileTags, tagFile, untagFile, createTag, refreshTags } = useStorage()

const open = ref(false)
const targetFile = ref<ApiFileEntry | null>(null)
const fileTags = ref<ApiTag[]>([])
const loading = ref(false)
const newTagName = ref('')

const TAG_COLORS = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316'
]
const newTagColor = ref(TAG_COLORS[0])

async function show(file: ApiFileEntry) {
  targetFile.value = file
  open.value = true
  loading.value = true
  try {
    fileTags.value = await getFileTags(file.id)
  } finally {
    loading.value = false
  }
}

function isTagged(tagId: string): boolean {
  return fileTags.value.some(t => t.id === tagId)
}

async function toggleTag(tag: ApiTag) {
  if (!targetFile.value) return
  if (isTagged(tag.id)) {
    await untagFile(targetFile.value.id, tag.id)
    fileTags.value = fileTags.value.filter(t => t.id !== tag.id)
  } else {
    await tagFile(targetFile.value.id, tag.id)
    fileTags.value = [...fileTags.value, tag]
  }
}

async function handleCreateAndApply() {
  if (!targetFile.value) return
  const label = newTagName.value.trim()
  if (!label) return
  const tag = await createTag(label, newTagColor.value ?? '#eab308')
  await tagFile(targetFile.value.id, tag.id)
  fileTags.value = [...fileTags.value, tag]
  newTagName.value = ''
  newTagColor.value = TAG_COLORS[0]
  await refreshTags()
}

defineExpose({ show })
</script>

<template>
  <UModal
    v-model:open="open"
    title="Tags"
    :description="
      targetFile
        ? `Manage tags for ${targetFile.name}${targetFile.ext || ''}`
        : ''
    "
  >
    <template #body>
      <div
        v-if="loading"
        class="text-sm text-muted py-4 text-center"
      >
        Loading...
      </div>
      <div
        v-else
        class="space-y-1"
      >
        <button
          v-for="tag in tags"
          :key="tag.id"
          class="w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm hover:bg-elevated transition-colors"
          @click="toggleTag(tag)"
        >
          <span
            class="size-4 rounded border-2 flex items-center justify-center shrink-0"
            :style="{
              borderColor: tag.color,
              background: isTagged(tag.id) ? tag.color : 'transparent'
            }"
          >
            <UIcon
              v-if="isTagged(tag.id)"
              name="i-lucide-check"
              class="size-3 text-white"
            />
          </span>
          <span class="text-default">{{ tag.label }}</span>
        </button>

        <div
          v-if="tags.length === 0"
          class="text-sm text-muted py-2"
        >
          No tags yet. Create one below.
        </div>

        <div class="pt-3 mt-2 border-t border-default space-y-2">
          <UInput
            v-model="newTagName"
            placeholder="New tag name..."
            size="sm"
            @keydown.enter="handleCreateAndApply"
          />
          <div
            v-if="newTagName.trim()"
            class="flex items-center gap-3"
          >
            <div class="flex gap-2">
              <button
                v-for="color in TAG_COLORS"
                :key="color"
                class="size-5 rounded-full ring-offset-2 ring-offset-default transition-shadow"
                :class="
                  newTagColor === color
                    ? 'ring-2 ring-primary'
                    : 'hover:ring-1 hover:ring-muted'
                "
                :style="{ background: color }"
                @click="newTagColor = color"
              />
            </div>
            <UButton
              label="Create & Apply"
              size="xs"
              class="ml-auto"
              @click="handleCreateAndApply"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
