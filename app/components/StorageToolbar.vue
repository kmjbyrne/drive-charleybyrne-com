<script setup lang="ts">
import type { DropdownMenuItem } from '#ui/components/DropdownMenu.vue'

defineProps<{
  breadcrumbItems: { label: string, click?: () => void }[]
  viewModes: { id: string, icon: string, label: string }[]
  columnToggleItems: DropdownMenuItem[][]
  navbarCompact: boolean
  hideButtonLabels: boolean
  uploading: boolean
  canCreate: boolean
  newMenuItems: DropdownMenuItem[][]
}>()

const viewMode = defineModel<string>('viewMode', { required: true })
const previewPinned = defineModel<boolean>('previewPinned', { required: true })
const sidebarOpen = defineModel<boolean>('sidebarOpen', { required: true })
const sidebarCollapsed = defineModel<boolean>('sidebarCollapsed', { required: true })

const emit = defineEmits<{
  (e: 'upload', files: FileList): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)

function triggerUpload() {
  fileInput.value?.click()
}

async function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  emit('upload', input.files)
  input.value = ''
}

defineExpose({ triggerUpload })
</script>

<template>
  <UDashboardNavbar :toggle="false">
    <template #left>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-panel-left"
          variant="ghost"
          color="neutral"
          size="xs"
          title="Toggle sidebar"
          class="lg:hidden"
          @click="sidebarOpen = true"
        />
        <UButton
          :icon="
            sidebarCollapsed
              ? 'i-lucide-panel-left-open'
              : 'i-lucide-panel-left-close'
          "
          variant="ghost"
          color="neutral"
          size="xs"
          title="Toggle sidebar"
          class="max-lg:hidden"
          @click="sidebarCollapsed = !sidebarCollapsed"
        />
        <UButton
          icon="i-lucide-chevron-left"
          variant="ghost"
          color="neutral"
          size="xs"
          title="Back"
          @click="$router.back()"
        />
        <UButton
          icon="i-lucide-chevron-right"
          variant="ghost"
          color="neutral"
          size="xs"
          title="Forward"
          @click="$router.forward()"
        />
        <UBreadcrumb :items="breadcrumbItems" />
      </div>
    </template>

    <template #right>
      <div
        v-if="!navbarCompact"
        class="flex gap-0.5 p-0.5 bg-elevated rounded-md"
      >
        <UButton
          v-for="mode in viewModes"
          :key="mode.id"
          :icon="mode.icon"
          :variant="viewMode === mode.id ? 'solid' : 'ghost'"
          :color="'neutral'"
          size="xs"
          :title="mode.label"
          @click="viewMode = mode.id"
        />
      </div>

      <UButton
        v-if="!navbarCompact"
        :icon="
          previewPinned
            ? 'i-lucide-panel-right-close'
            : 'i-lucide-panel-right-open'
        "
        variant="ghost"
        color="neutral"
        size="xs"
        :title="previewPinned ? 'Hide preview' : 'Show preview'"
        @click="previewPinned = !previewPinned"
      />

      <UDropdownMenu
        v-if="navbarCompact"
        :items="columnToggleItems"
        :content="{ align: 'end' as const }"
      >
        <UButton
          icon="i-lucide-settings-2"
          variant="ghost"
          color="neutral"
          size="xs"
          title="View settings"
        />
      </UDropdownMenu>

      <template v-if="canCreate">
        <USeparator
          v-if="!navbarCompact"
          orientation="vertical"
          class="h-5"
        />

        <UButton
          icon="i-lucide-upload"
          variant="outline"
          color="neutral"
          size="xs"
          title="Upload files"
          :loading="uploading"
          @click="triggerUpload"
        >
          <span v-if="!hideButtonLabels">Upload</span>
        </UButton>
        <input
          ref="fileInput"
          type="file"
          multiple
          class="hidden"
          @change="onFilesSelected"
        >
        <UDropdownMenu :items="newMenuItems">
          <UButton
            icon="i-lucide-plus"
            size="xs"
            title="New"
          >
            <span v-if="!hideButtonLabels">New</span>
          </UButton>
        </UDropdownMenu>
      </template>
    </template>
  </UDashboardNavbar>
</template>
