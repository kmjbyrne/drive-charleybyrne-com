<script setup lang="ts">
const props = defineProps<{
  src: string
  fileName?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const editorRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
let superdocInstance: any = null

defineShortcuts({
  escape: () => emit('close')
})

onMounted(async () => {
  if (!editorRef.value) return

  try {
    const { SuperDoc } = await import('superdoc')
    await import('superdoc/style.css')

    const response = await fetch(props.src)
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.status}`)
    }

    const blob = await response.blob()
    const file = new File([blob], props.fileName || 'document.docx')

    superdocInstance = new SuperDoc({
      selector: `#${editorRef.value.id}`,
      document: file
    })
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load document'
  }
  finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (superdocInstance?.destroy) {
    superdocInstance.destroy()
  }
})

async function handleExport() {
  if (!superdocInstance) return
  await superdocInstance.export()
}
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
        icon="i-lucide-download"
        label="Export"
        variant="ghost"
        size="xs"
        class="text-white hover:bg-white/10"
        @click="handleExport"
      />
      <UButton
        icon="i-lucide-x"
        variant="ghost"
        size="xs"
        class="text-white hover:bg-white/10"
        @click="emit('close')"
      />
    </div>

    <!-- Editor area -->
    <div class="flex-1 relative overflow-hidden">
      <!-- Loading -->
      <div
        v-if="loading"
        class="absolute inset-0 flex items-center justify-center bg-default z-10"
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
        class="absolute inset-0 flex items-center justify-center bg-default z-10"
      >
        <UAlert
          icon="i-lucide-alert-circle"
          color="error"
          :title="error"
          class="max-w-md"
        />
      </div>

      <!-- SuperDoc editor container -->
      <div
        id="superdoc-editor"
        ref="editorRef"
        class="h-full w-full"
      />
    </div>
  </div>
</template>
