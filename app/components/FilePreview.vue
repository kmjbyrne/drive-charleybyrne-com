<script setup lang="ts">
import type { ApiFileEntry } from '~/composables/useStorage'

const props = defineProps<{
  file: ApiFileEntry
}>()

const emit = defineEmits<{
  close: []
  share: [file: ApiFileEntry]
}>()

const fileType = computed(() => deriveFileType(props.file.ext, props.file.type))

const downloadUrl = computed(() => {
  if (!props.file.blobKey) return null
  return `/api/storage/download?key=${encodeURIComponent(props.file.blobKey)}`
})

const isImage = computed(() => fileType.value === 'image')
const isPdf = computed(() => fileType.value === 'pdf')
const isVideo = computed(() => fileType.value === 'video')
const isAudio = computed(() => fileType.value === 'audio')
const isMarkdown = computed(() => fileType.value === 'markdown')
const isCode = computed(() => fileType.value === 'code')
const isText = computed(() => {
  const e = props.file.ext?.toLowerCase()
  return e === '.txt' || e === '.rtf'
})
const isDocx = computed(() =>
  props.file.ext?.toLowerCase() === '.docx'
)

const showDocxViewer = ref(false)

// Inline DOCX preview (read-only via docx-preview)
const docxContainerRef = ref<HTMLElement | null>(null)
const docxLoading = ref(false)

watch(() => props.file.id, async () => {
  if (!isDocx.value || !downloadUrl.value) return
  await nextTick()
  if (!docxContainerRef.value) return

  docxLoading.value = true
  try {
    const { renderAsync } = await import('docx-preview')
    const response = await fetch(downloadUrl.value)
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
    const arrayBuffer = await response.arrayBuffer()
    await renderAsync(arrayBuffer, docxContainerRef.value, undefined, {
      className: 'docx-preview-wrapper',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true
    })
  } catch (e) {
    console.error('DOCX preview failed:', e)
  } finally {
    docxLoading.value = false
  }
}, { immediate: true })

// Fetch text content for markdown, code, and text files
const textContent = ref<string | null>(null)
const textLoading = ref(false)

const needsTextFetch = computed(() =>
  (isMarkdown.value || isCode.value || isText.value) && downloadUrl.value
)

watch(() => props.file.id, async () => {
  textContent.value = null
  if (!needsTextFetch.value || !downloadUrl.value) return
  textLoading.value = true
  try {
    textContent.value = await $fetch<string>(downloadUrl.value, { responseType: 'text' })
  } catch {
    textContent.value = null
  } finally {
    textLoading.value = false
    if (isMarkdown.value) {
      nextTick(() => window.__renderMermaid?.())
    }
  }
}, { immediate: true })

function formatSize(bytes: number): string {
  if (bytes === 0) return '---'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="flex flex-col h-full border-l border-default bg-default">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-default">
      <div class="flex items-center gap-2 min-w-0">
        <FileIcon
          :type="fileType"
          :ext="file.ext"
          size="sm"
        />
        <span class="text-sm font-semibold text-default truncate">
          {{ file.name }}{{ file.ext || '' }}
        </span>
      </div>
      <UButton
        icon="i-lucide-x"
        variant="ghost"
        color="neutral"
        size="xs"
        @click="emit('close')"
      />
    </div>

    <!-- Preview area -->
    <div class="flex-1 overflow-auto flex flex-col min-h-0">
      <!-- Image preview -->
      <div
        v-if="isImage && downloadUrl"
        class="p-4 flex items-center justify-center"
      >
        <img
          :src="downloadUrl"
          :alt="file.name"
          class="max-w-full max-h-80 rounded-lg object-contain"
        >
      </div>

      <!-- PDF preview -->
      <div
        v-else-if="isPdf && downloadUrl"
        class="flex-1 min-h-0"
      >
        <iframe
          :src="downloadUrl"
          class="w-full h-full border-0"
          :title="file.name"
        />
      </div>

      <!-- Video preview -->
      <div
        v-else-if="isVideo && downloadUrl"
        class="p-4"
      >
        <video
          :src="downloadUrl"
          controls
          class="w-full rounded-lg"
        />
      </div>

      <!-- Audio preview -->
      <div
        v-else-if="isAudio && downloadUrl"
        class="p-4 flex flex-col items-center gap-4 pt-8"
      >
        <FileIcon
          :type="fileType"
          :ext="file.ext"
          size="lg"
        />
        <audio
          :src="downloadUrl"
          controls
          class="w-full"
        />
      </div>

      <!-- Markdown preview -->
      <div
        v-else-if="isMarkdown && downloadUrl"
        class="p-4"
      >
        <div
          v-if="textLoading"
          class="text-xs text-muted text-center py-4"
        >
          Loading...
        </div>
        <div
          v-else-if="textContent"
          class="markdown-preview prose prose-sm dark:prose-invert max-w-none leading-relaxed font-sans"
        >
          <MarkdownRenderer :value="textContent" />
        </div>
      </div>

      <!-- Code / text preview -->
      <div
        v-else-if="(isCode || isText) && downloadUrl"
        class="p-4"
      >
        <div
          v-if="textLoading"
          class="text-xs text-muted text-center py-4"
        >
          Loading...
        </div>
        <pre
          v-else-if="textContent"
          class="text-xs font-mono bg-elevated rounded-lg p-3 overflow-auto max-h-96 whitespace-pre-wrap text-default"
        >{{ textContent }}</pre>
      </div>

      <!-- DOCX inline preview -->
      <div
        v-else-if="isDocx && downloadUrl"
        class="flex-1 min-h-0 flex flex-col relative"
      >
        <div
          v-if="docxLoading"
          class="absolute inset-0 flex items-center justify-center bg-default z-10"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="size-6 text-muted animate-spin"
          />
        </div>
        <div
          ref="docxContainerRef"
          class="flex-1 min-h-0 overflow-auto"
        />
        <div class="px-4 py-2 border-t border-default">
          <UButton
            icon="i-lucide-pen-line"
            label="Open in editor"
            variant="outline"
            color="neutral"
            size="xs"
            block
            @click="showDocxViewer = true"
          />
        </div>
      </div>

      <!-- Generic file icon -->
      <div
        v-else
        class="p-4 flex flex-col items-center gap-2 pt-8"
      >
        <FileIcon
          :type="fileType"
          :ext="file.ext"
          size="lg"
        />
        <span class="text-xs text-muted">No preview available</span>
      </div>
    </div>

    <!-- Metadata -->
    <div class="px-4 py-3 border-t border-default space-y-2 text-xs">
      <div class="flex justify-between">
        <span class="text-muted">Size</span>
        <span class="text-default font-mono">{{ formatSize(file.sizeBytes) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted">Modified</span>
        <span class="text-default">{{ formatDate(file.modifiedAt) }}</span>
      </div>
      <div
        v-if="file.mimeType"
        class="flex justify-between"
      >
        <span class="text-muted">Type</span>
        <span class="text-default">{{ file.mimeType }}</span>
      </div>
      <div class="pt-2 flex flex-col gap-1.5">
        <UButton
          icon="i-lucide-share-2"
          label="Share"
          variant="outline"
          color="neutral"
          size="xs"
          block
          @click="emit('share', file)"
        />
        <UButton
          v-if="downloadUrl"
          icon="i-lucide-download"
          label="Download"
          variant="outline"
          color="neutral"
          size="xs"
          block
          :to="downloadUrl"
          target="_blank"
        />
      </div>
    </div>

    <!-- DOCX editor overlay -->
    <DocxViewer
      v-if="showDocxViewer && downloadUrl"
      :src="downloadUrl"
      :file-name="`${file.name}${file.ext || ''}`"
      @close="showDocxViewer = false"
    />
  </div>
</template>
