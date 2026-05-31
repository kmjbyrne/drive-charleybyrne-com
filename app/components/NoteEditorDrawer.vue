<script setup lang="ts">
import type { ApiFileEntry } from '~/composables/useStorage'

const props = defineProps<{
  file: ApiFileEntry
  content: string
  loading: boolean
  saving: boolean
}>()

const emit = defineEmits<{
  (e: 'update:content', value: string): void
  (e: 'close'): void
  (e: 'share', file: ApiFileEntry): void
}>()

const { renameFile } = useStorage()

const fileIsMarkdown = computed(() => {
  const ext = props.file.ext?.toLowerCase()
  return ext === '.md' || ext === '.mdx'
})

const editingName = ref(false)
const nameValue = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

function startRename() {
  nameValue.value = props.file.name
  editingName.value = true
  nextTick(() => {
    nameInput.value?.focus()
    nameInput.value?.select()
  })
}

async function commitRename() {
  editingName.value = false
  const trimmed = nameValue.value.trim()
  if (!trimmed || trimmed === props.file.name) return
  await renameFile(props.file.id, trimmed)
}

const tab = ref<'edit' | 'view'>('edit')
const split = ref(false)
const scrollLock = ref(true)

const editorRef = ref<{ getScrollElement: () => HTMLElement | null } | null>(null)
const splitPreviewRef = ref<HTMLElement | null>(null)
let scrollSyncSource: 'editor' | 'preview' | null = null

function onEditorScroll() {
  if (!scrollLock.value || scrollSyncSource === 'preview') return
  const editorEl = editorRef.value?.getScrollElement()
  const previewEl = splitPreviewRef.value
  if (!editorEl || !previewEl) return
  scrollSyncSource = 'editor'
  const ratio = editorEl.scrollTop / (editorEl.scrollHeight - editorEl.clientHeight || 1)
  previewEl.scrollTop = ratio * (previewEl.scrollHeight - previewEl.clientHeight)
  requestAnimationFrame(() => {
    scrollSyncSource = null
  })
}

function onPreviewScroll() {
  if (!scrollLock.value || scrollSyncSource === 'editor') return
  const editorEl = editorRef.value?.getScrollElement()
  const previewEl = splitPreviewRef.value
  if (!editorEl || !previewEl) return
  scrollSyncSource = 'preview'
  const ratio = previewEl.scrollTop / (previewEl.scrollHeight - previewEl.clientHeight || 1)
  editorEl.scrollTop = ratio * (editorEl.scrollHeight - editorEl.clientHeight)
  requestAnimationFrame(() => {
    scrollSyncSource = null
  })
}

watch([split, editorRef, splitPreviewRef], () => {
  nextTick(() => {
    const editorEl = editorRef.value?.getScrollElement()
    const previewEl = splitPreviewRef.value
    editorEl?.removeEventListener('scroll', onEditorScroll)
    previewEl?.removeEventListener('scroll', onPreviewScroll)
    if (split.value && editorEl && previewEl) {
      editorEl.addEventListener('scroll', onEditorScroll, { passive: true })
      previewEl.addEventListener('scroll', onPreviewScroll, { passive: true })
    }
  })
}, { flush: 'post' })

watch([tab, split, () => props.content], () => {
  if (tab.value === 'view' || split.value) {
    nextTick(() => window.__renderMermaid?.())
  }
})

defineExpose({
  setTab: (t: 'edit' | 'view') => { tab.value = t },
  isSplitEdit: computed(() => split.value && tab.value === 'edit')
})
</script>

<template>
  <div class="flex h-full flex-1 min-w-0 border-l border-default bg-default">
    <!-- Editor side -->
    <div class="flex flex-col flex-1 min-w-0">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-default">
        <div class="flex items-center gap-2 min-w-0">
          <FileIcon
            :type="deriveFileType(file.ext, file.type)"
            :ext="file.ext"
            size="xs"
          />
          <input
            v-if="editingName"
            ref="nameInput"
            v-model="nameValue"
            class="text-sm font-semibold text-default bg-transparent border border-primary rounded px-1 py-0.5 flex-1 min-w-0 outline-none"
            @keydown.enter="commitRename"
            @keydown.escape="editingName = false"
            @blur="commitRename"
          >
          <span
            v-else
            class="text-sm font-semibold text-default truncate cursor-pointer hover:text-primary transition-colors"
            title="Click to rename"
            @click="startRename"
          >{{ file.name }}</span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span
            v-if="saving"
            class="text-xs text-muted"
          >Saving...</span>
          <span
            v-else-if="!loading"
            class="text-xs text-muted"
          >Saved</span>
          <UButton
            icon="i-lucide-share-2"
            variant="ghost"
            color="neutral"
            size="xs"
            title="Share"
            @click="emit('share', file)"
          />
          <UButton
            v-if="fileIsMarkdown && split"
            icon="i-lucide-lock"
            :variant="scrollLock ? 'soft' : 'ghost'"
            color="neutral"
            size="xs"
            title="Toggle scroll lock"
            @click="scrollLock = !scrollLock"
          />
          <UButton
            v-if="fileIsMarkdown && tab === 'edit'"
            icon="i-lucide-columns-2"
            :variant="split ? 'soft' : 'ghost'"
            color="neutral"
            size="xs"
            title="Toggle split preview"
            @click="split = !split"
          />
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="emit('close')"
          />
        </div>
      </div>

      <!-- Edit / View tabs (markdown only) -->
      <div
        v-if="fileIsMarkdown && !split"
        class="flex border-b border-default"
      >
        <button
          :class="[
            'flex-1 px-3 py-2 text-xs font-medium transition-colors',
            tab === 'edit'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted hover:text-default'
          ]"
          @click="tab = 'edit'"
        >
          Edit
        </button>
        <button
          :class="[
            'flex-1 px-3 py-2 text-xs font-medium transition-colors',
            tab === 'view'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted hover:text-default'
          ]"
          @click="tab = 'view'"
        >
          View
        </button>
      </div>

      <!-- Content -->
      <div
        v-if="loading"
        class="flex-1 flex items-center justify-center"
      >
        <span class="text-sm text-muted">Loading...</span>
      </div>
      <template v-else>
        <ClientOnly v-if="!fileIsMarkdown || tab === 'edit'">
          <MarkdownEditor
            :key="file.id"
            ref="editorRef"
            :model-value="content"
            :mode="fileIsMarkdown ? 'markdown' : 'code'"
            class="flex-1 min-h-0"
            @update:model-value="emit('update:content', $event)"
          />
        </ClientOnly>
        <div
          v-else
          class="flex-1 overflow-auto min-h-0 markdown-preview prose prose-sm dark:prose-invert max-w-none leading-relaxed font-sans p-4"
        >
          <MarkdownRenderer :value="content" />
        </div>
      </template>
    </div>

    <!-- Split preview pane -->
    <div
      v-if="fileIsMarkdown && split && tab === 'edit' && !loading"
      class="flex flex-col flex-1 min-w-0 border-l border-default"
    >
      <div class="px-4 py-3 border-b border-default">
        <span class="text-xs font-medium text-muted">Preview</span>
      </div>
      <div
        ref="splitPreviewRef"
        class="flex-1 overflow-auto min-h-0 p-4 markdown-preview prose prose-sm dark:prose-invert max-w-none leading-relaxed font-sans"
      >
        <MarkdownRenderer :value="content" />
      </div>
    </div>
  </div>
</template>
