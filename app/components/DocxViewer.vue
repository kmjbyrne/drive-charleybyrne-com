<script setup lang="ts">
const props = defineProps<{
  src: string
  fileName?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const containerRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

defineShortcuts({
  escape: () => emit('close')
})

onMounted(async () => {
  if (!containerRef.value) return

  try {
    const { renderAsync } = await import('docx-preview')
    const response = await fetch(props.src)

    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.status}`)
    }

    const blob = await response.blob()

    await renderAsync(blob, containerRef.value, undefined, {
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: true,
      ignoreFonts: false,
      breakPages: false,
      ignoreLastRenderedPageBreak: true,
      experimental: true,
      trimXmlDeclaration: true,
      useBase64URL: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true
    })
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to render document'
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-default">
    <!-- Title bar -->
    <div class="flex items-center gap-3 px-4 py-2.5 border-b border-default bg-[#185abd] text-white shrink-0">
      <div class="size-6 rounded bg-white text-[#185abd] flex items-center justify-center font-extrabold text-xs font-serif">
        W
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-semibold truncate">
          {{ fileName || 'Document' }}
        </div>
        <div class="text-xs opacity-70">
          Saved to Storage
        </div>
      </div>
      <UButton
        icon="i-lucide-x"
        variant="ghost"
        size="xs"
        class="text-white hover:bg-white/10"
        @click="emit('close')"
      />
    </div>

    <!-- Ribbon tabs -->
    <div class="flex items-center px-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-sm shrink-0">
      <span
        v-for="(tab, i) in ['File', 'Home', 'Insert', 'Layout', 'References', 'Review', 'View', 'Help']"
        :key="tab"
        :class="[
          'px-3 py-2 cursor-pointer border-b-2 transition-colors',
          i === 1 ? 'font-semibold text-[#185abd] border-[#185abd]' : 'text-gray-600 dark:text-gray-400 border-transparent'
        ]"
      >
        {{ tab }}
      </span>
    </div>

    <!-- Document content -->
    <div class="flex-1 overflow-auto bg-[#e7e8ea] dark:bg-gray-900">
      <!-- Loading -->
      <div
        v-if="loading"
        class="flex items-center justify-center h-full"
      >
        <div class="text-center">
          <UIcon
            name="i-lucide-loader-2"
            class="size-8 text-muted animate-spin mb-3"
          />
          <p class="text-sm text-muted">
            Loading document...
          </p>
        </div>
      </div>

      <!-- Error -->
      <div
        v-if="error"
        class="flex items-center justify-center h-full"
      >
        <UAlert
          icon="i-lucide-alert-circle"
          color="error"
          :title="error"
          class="max-w-md"
        />
      </div>

      <!-- Rendered document -->
      <div
        ref="containerRef"
        class="docx-viewer-container"
      />
    </div>

    <!-- Status bar -->
    <div class="flex items-center px-4 py-1.5 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 gap-5 shrink-0">
      <span>Preview mode</span>
      <span class="flex items-center gap-1.5">
        <span class="size-1.5 rounded-full bg-green-500" />
        Read-only
      </span>
      <div class="flex-1" />
      <span>100%</span>
    </div>
  </div>
</template>

<style>
.docx-viewer-container {
  display: flex;
  justify-content: center;
  padding: 24px 0;
  min-height: 100%;
}

.docx-viewer-container .docx-wrapper {
  background: transparent !important;
  padding: 16px 0 !important;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.docx-viewer-container .docx-wrapper > section.docx {
  background: white !important;
  box-shadow: 0 0 0 1px #e5e7eb, 0 4px 12px rgba(0, 0, 0, 0.08) !important;
  border-radius: 2px !important;
  margin-bottom: 16px !important;
  max-width: 860px;
  width: 100%;
  padding: 60px 72px !important;
  min-height: auto !important;
}
</style>
