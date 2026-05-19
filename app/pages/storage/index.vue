<script setup lang="ts">
import { TAGS } from '~/data/tags'

definePageMeta({ layout: 'dashboard' })

const {
  path,
  special,
  viewMode,
  items,
  selected,
  selectedId,
  currentNode,
  previewPinned,
  viewerFile,
  sidebarOpen,
  sidebarCollapsed,
  selectItem,
  openItem
} = useStorage()

const specialLabels: Record<string, string> = {
  home: 'Home',
  recents: 'Recents',
  starred: 'Starred',
  shared: 'Shared with me',
  trash: 'Trash',
  tags: 'Tags'
}

const title = computed(() => {
  if (special.value) return specialLabels[special.value] || ''
  return currentNode.value?.name || ''
})

const subtitle = computed(() => {
  if (special.value === 'starred') return `${items.value.length} starred items`
  if (special.value === 'recents') return 'Recently modified across all spaces'
  if (special.value === 'shared') return 'Files others have shared with you'
  if (special.value === 'home') return 'Quick access to everything you care about'
  if (special.value === 'trash') return 'Files are permanently deleted after 30 days'
  if (special.value === 'tags') return 'Browse files by tag'
  return `${items.value.length} items`
})

const breadcrumbItems = computed(() => {
  if (special.value) {
    return [{ label: specialLabels[special.value] || '' }]
  }
  return path.value.slice(1).map((n, i, arr) => ({
    label: n.name,
    click: i < arr.length - 1 ? () => openItem(n) : undefined
  }))
})

const viewModes = [
  { id: 'list' as const, icon: 'i-lucide-list', label: 'List' },
  { id: 'grid' as const, icon: 'i-lucide-layout-grid', label: 'Grid' },
  { id: 'columns' as const, icon: 'i-lucide-columns-3', label: 'Columns' }
]
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar>
        <template #left>
          <div class="flex items-center gap-2">
            <!-- Sidebar toggle: slideover on mobile, collapse on desktop -->
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
              :icon="sidebarCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
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
            />
            <UButton
              icon="i-lucide-chevron-right"
              variant="ghost"
              color="neutral"
              size="xs"
            />
            <UBreadcrumb :items="breadcrumbItems" />
          </div>
        </template>

        <template #right>
          <!-- View mode toggle -->
          <div class="flex gap-0.5 p-0.5 bg-elevated rounded-md">
            <UButton
              v-for="mode in viewModes"
              :key="mode.id"
              :icon="mode.icon"
              :variant="viewMode === mode.id ? 'solid' : 'ghost'"
              :color="viewMode === mode.id ? 'neutral' : 'neutral'"
              size="xs"
              :title="mode.label"
              @click="viewMode = mode.id"
            />
          </div>

          <UButton
            :icon="previewPinned ? 'i-lucide-panel-right-close' : 'i-lucide-panel-right-open'"
            variant="ghost"
            color="neutral"
            size="xs"
            :title="previewPinned ? 'Hide preview' : 'Show preview'"
            @click="previewPinned = !previewPinned"
          />

          <USeparator
            orientation="vertical"
            class="h-5"
          />

          <UButton
            icon="i-lucide-upload"
            label="Upload"
            variant="outline"
            color="neutral"
            size="xs"
          />
          <UButton
            icon="i-lucide-share-2"
            label="Share"
            variant="outline"
            color="neutral"
            size="xs"
          />
          <UButton
            icon="i-lucide-plus"
            label="New"
            size="xs"
          />

          <UAvatar
            alt="James"
            size="xs"
            :ui="{ fallback: 'text-[10px] font-semibold bg-green-500 text-white' }"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col h-full">
        <!-- Content header -->
        <div class="px-5 pt-5 pb-3">
          <h1 class="text-xl font-bold text-default">
            {{ title }}
          </h1>
          <p class="text-sm text-muted mt-1">
            {{ subtitle }}
          </p>
        </div>

        <!-- Tags view -->
        <div
          v-if="special === 'tags'"
          class="px-5 pt-2"
        >
          <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            <button
              v-for="tag in TAGS"
              :key="tag.id"
              class="flex items-center gap-3 p-4 rounded-lg border border-default hover:border-muted hover:bg-elevated transition-colors text-left"
            >
              <span
                class="size-3 rounded-full shrink-0"
                :style="{ background: tag.color }"
              />
              <span class="text-sm font-medium text-default">{{ tag.label }}</span>
            </button>
          </div>
        </div>

        <!-- File list -->
        <div
          v-else-if="viewMode === 'list'"
          class="flex-1 overflow-auto px-3.5"
        >
          <!-- Column headers -->
          <div class="grid grid-cols-[1fr_130px_150px_110px_40px] px-3 py-2 text-xs font-semibold text-dimmed uppercase tracking-wider border-b border-default sticky top-0 bg-default z-10">
            <span>Name</span>
            <span>Members</span>
            <span>Modified</span>
            <span>Size</span>
            <span />
          </div>

          <FileListItem
            v-for="file in items"
            :key="file.id"
            :file="file"
            :selected="selectedId === file.id"
            @select="selectItem"
            @open="openItem"
          />

          <!-- Empty state -->
          <UEmpty
            v-if="items.length === 0"
            icon="i-lucide-trash-2"
            title="Nothing here"
            description="Trash is empty. Deleted files appear here for 30 days before being permanently removed."
            class="py-20"
          />
        </div>

        <!-- Grid view placeholder -->
        <div
          v-else-if="viewMode === 'grid'"
          class="flex-1 overflow-auto px-5 pt-2"
        >
          <div class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5">
            <div
              v-for="file in items"
              :key="file.id"
              :class="[
                'rounded-xl border cursor-pointer transition-all p-3 flex flex-col gap-2.5',
                selectedId === file.id ? 'border-primary ring-1 ring-primary' : 'border-default hover:border-muted'
              ]"
              @click="selectItem(file)"
              @dblclick="openItem(file)"
            >
              <div class="h-24 rounded-lg bg-elevated flex items-center justify-center">
                <FileIcon
                  :type="file.type"
                  size="lg"
                />
              </div>
              <div>
                <div class="text-xs font-semibold text-default truncate">
                  {{ file.name }}<span class="text-dimmed font-normal">{{ file.ext || '' }}</span>
                </div>
                <div class="text-[11px] text-muted mt-0.5 flex items-center gap-1.5">
                  <span>{{ file.modified }}</span>
                  <UIcon
                    v-if="file.starred"
                    name="i-lucide-star"
                    class="size-2.5 text-yellow-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <UEmpty
            v-if="items.length === 0"
            icon="i-lucide-trash-2"
            title="Nothing here"
            description="Trash is empty."
            class="py-20"
          />
        </div>

        <!-- Columns view placeholder -->
        <div
          v-else-if="viewMode === 'columns'"
          class="flex-1 overflow-auto flex items-center justify-center text-muted"
        >
          <div class="text-center">
            <UIcon
              name="i-lucide-columns-3"
              class="size-10 mb-3 text-dimmed"
            />
            <p class="text-sm font-medium">
              Columns view coming soon
            </p>
            <p class="text-xs text-dimmed mt-1">
              Finder-style column navigation
            </p>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- DOCX Viewer overlay -->
  <ClientOnly>
    <DocxViewer
      v-if="viewerFile?.mockFile"
      :src="viewerFile.mockFile"
      :file-name="viewerFile.name + (viewerFile.ext || '')"
      @close="viewerFile = null"
    />
  </ClientOnly>
</template>
