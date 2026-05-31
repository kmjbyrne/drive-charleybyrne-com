<script setup lang="ts">
import type { SpecialView, ApiFileEntry } from '~/composables/useStorage'

definePageMeta({ layout: 'dashboard' })

const route = useRoute()

const SPECIAL_VIEWS = ['home', 'recents', 'starred', 'shared', 'shared-by-me', 'trash', 'tags']

const { user: _user } = useAuth()
const { onboarding: t } = useContent()
const { complete: completeStep } = useOnboarding()

const slug = computed(() => {
  const raw = route.params.slug
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') return raw.split('/')
  return []
})

// Derive special view or space/folder IDs from the route
const routeSpecial = computed<SpecialView>(() => {
  const first = slug.value[0]
  if (
    slug.value.length === 1
    && first
    && (SPECIAL_VIEWS as string[]).includes(first)
  ) {
    return first as SpecialView
  }
  return null
})

// /tags/:tagId
const routeTagId = computed<string | null>(() => {
  if (slug.value[0] === 'tags' && slug.value.length === 2) {
    return slug.value[1] ?? null
  }
  return null
})

// /spaces/:spaceId/FolderA/FolderB/...
const routeSpaceId = computed<string | null>(() => {
  if (slug.value[0] === 'spaces' && slug.value.length >= 2) {
    return slug.value[1] ?? null
  }
  return null
})

// Folder name segments after the spaceId
const routeFolderPath = computed<string[]>(() => {
  if (slug.value[0] === 'spaces' && slug.value.length >= 3) {
    return slug.value.slice(2).map(s => decodeURIComponent(s))
  }
  return []
})

const {
  spaces,
  tags,
  special,
  viewMode,
  items,
  selectedId,
  previewPinned,
  sidebarOpen,
  sidebarCollapsed,
  loading,
  uploading,
  uploadQueue,
  dismissUploadQueue,
  currentSpaceId,
  currentTagId,
  currentFolderPath,
  breadcrumb,
  starredCount,
  selectItem,
  openItem,
  uploadFiles,
  createFolder,
  refreshFiles,
  syncFromRoute,
  navigateToSpace,
  navigateToFolder: _navigateToFolder
} = useStorage()

// Session persistence
const { save: saveSession, load: loadSession } = useSessionRestore()

// Restore UI state from previous session on client
if (import.meta.client) {
  const session = loadSession()
  viewMode.value = (session.viewMode as typeof viewMode.value) || 'list'
  previewPinned.value = session.previewPinned
  sidebarCollapsed.value = session.sidebarCollapsed
  if (session.selectedId) selectedId.value = session.selectedId
}

// Sync composable state from route on navigation
let initialLoad = true
watch(
  slug,
  () => {
    syncFromRoute(
      routeSpecial.value,
      routeSpaceId.value,
      routeFolderPath.value,
      routeTagId.value
    )
    if (!initialLoad) {
      closeEditor()
      selectedEntry.value = null
    }
    initialLoad = false
  },
  { immediate: true }
)

// Persist route to session on every navigation
watch(
  () => route.fullPath,
  path => saveSession({ route: path }),
  { immediate: true }
)

// Persist UI state changes
watch(viewMode, v => saveSession({ viewMode: v }))
watch(previewPinned, v => saveSession({ previewPinned: v }))
watch(sidebarCollapsed, v => saveSession({ sidebarCollapsed: v }))
watch(selectedId, v => saveSession({ selectedId: v }))

// Column visibility & resize observer
const panelRef = ref<HTMLElement | null>(null)
const {
  visibleColumnKeys,
  listGridStyle,
  navbarCompact,
  hideButtonLabels,
  buildToggleItems
} = useColumnVisibility(panelRef)

// Page header
const specialLabels: Record<string, string> = {
  'home': 'Home',
  'recents': 'Recents',
  'starred': 'Starred',
  'shared': 'Shared with me',
  'shared-by-me': 'Shared by me',
  'trash': 'Trash',
  'tags': 'Tags'
}

const currentTag = computed(() => {
  if (!currentTagId.value) return null
  return tags.value.find(t => t.id === currentTagId.value) ?? null
})

const title = computed(() => {
  if (currentTag.value) return currentTag.value.label
  if (special.value) return specialLabels[special.value] || ''
  const crumbs = breadcrumb.value || []
  const last = crumbs[crumbs.length - 1]
  if (last) return last.name
  const space = spaces.value.find(s => s.id === currentSpaceId.value)
  return space?.name || ''
})

const subtitle = computed(() => {
  if (currentTag.value)
    return `${items.value.length} files tagged "${currentTag.value.label}"`
  if (special.value === 'starred') return `${items.value.length} starred items`
  if (special.value === 'recents') return 'Recently modified across all spaces'
  if (special.value === 'shared') return 'Files others have shared with you'
  if (special.value === 'shared-by-me') return 'Files you have shared with others'
  if (special.value === 'home')
    return 'Quick access to everything you care about'
  if (special.value === 'trash')
    return 'Files are permanently deleted after 30 days'
  if (special.value === 'tags') return 'Browse files by tag'
  return `${items.value.length} items`
})

const breadcrumbItems = computed(() => {
  if (currentTag.value) {
    return [
      { label: 'Tags', to: '/tags' },
      { label: currentTag.value.label }
    ]
  }
  if (special.value) {
    return [{ label: specialLabels[special.value] || '' }]
  }
  const trail = breadcrumb.value || []
  return trail.map((node, i, arr) => {
    if (i >= arr.length - 1) return { label: node.name }

    if (node.type === 'space') {
      return { label: node.name, to: `/spaces/${node.id}` }
    }

    const folderNames = arr.slice(1, i + 1).map(n => encodeURIComponent(n.name))
    return { label: node.name, to: `/spaces/${currentSpaceId.value}/${folderNames.join('/')}` }
  })
})

// View modes
const allViewModes = [
  { id: 'list' as const, icon: 'i-lucide-list', label: 'List' },
  { id: 'grid' as const, icon: 'i-lucide-layout-grid', label: 'Grid' },
  { id: 'columns' as const, icon: 'i-lucide-columns-3', label: 'Columns' },
  { id: 'tree' as const, icon: 'i-lucide-git-branch', label: 'Tree' }
]

const spaceOnlyModes = new Set(['columns', 'tree'])

const viewModes = computed(() => {
  if (special.value) return allViewModes.filter(m => !spaceOnlyModes.has(m.id))
  return allViewModes
})

watch(special, (val) => {
  if (val && spaceOnlyModes.has(viewMode.value)) {
    viewMode.value = 'list'
  }
})

const columnToggleItems = buildToggleItems(
  allViewModes,
  viewMode,
  previewPinned
)

// New folder modal
const showNewFolder = ref(false)
const newFolderName = ref('')
const creatingFolder = ref(false)

async function handleCreateFolder() {
  const name = newFolderName.value.trim()
  if (!name) return
  creatingFolder.value = true
  try {
    await createFolder(name)
    showNewFolder.value = false
    newFolderName.value = ''
  } finally {
    creatingFolder.value = false
  }
}

// Tag modal
const tagModalRef = ref<{ show: (file: ApiFileEntry) => void } | null>(null)
const shareModalRef = ref<{ show: (file: ApiFileEntry) => void } | null>(null)

function openTagModal(file: ApiFileEntry) {
  tagModalRef.value?.show(file)
}

function openShareModal(entry: ApiFileEntry) {
  shareModalRef.value?.show(entry)
}

// Markdown editor state
const editorFile = ref<ApiFileEntry | null>(null)
const editorContent = ref('')
const editorLoading = ref(false)
const editorSaving = ref(false)
let saveTimeout: ReturnType<typeof setTimeout> | null = null
const noteEditorRef = ref<{ setTab: (t: 'edit' | 'view') => void, isSplitEdit: boolean } | null>(null)

function _isMarkdown(entry: ApiFileEntry): boolean {
  const ext = entry.ext?.toLowerCase()
  return ext === '.md' || ext === '.mdx'
}

async function openMarkdownDrawer(entry: ApiFileEntry, tab: 'edit' | 'view' = 'edit') {
  const needsFetch = editorFile.value?.id !== entry.id
  editorFile.value = entry
  nextTick(() => noteEditorRef.value?.setTab(tab))
  if (!needsFetch) return
  editorLoading.value = true
  try {
    const url = `/api/storage/download?key=${encodeURIComponent(entry.blobKey!)}`
    const text = await $fetch<string>(url, { responseType: 'text' })
    editorContent.value = text
  } catch {
    editorContent.value = ''
  } finally {
    editorLoading.value = false
  }
}

function onEditorUpdate(value: string) {
  editorContent.value = value
  if (!editorFile.value) return
  if (saveTimeout) clearTimeout(saveTimeout)
  const fileId = editorFile.value.id
  saveTimeout = setTimeout(async () => {
    editorSaving.value = true
    try {
      await $fetch(`/api/storage/files/${fileId}/content`, {
        method: 'PUT',
        body: { content: value }
      })
    } catch (err) {
      console.error('Failed to save markdown:', err)
    } finally {
      editorSaving.value = false
    }
  }, 1000)
}

function closeEditor() {
  if (saveTimeout) clearTimeout(saveTimeout)
  editorFile.value = null
  editorContent.value = ''
}

// Media viewer
const PLAYABLE_EXTS = [
  '.mp4', '.mov', '.avi', '.mkv', '.webm',
  '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.heic'
]

const viewerFile = ref<ApiFileEntry | null>(null)

function isPlayable(entry: ApiFileEntry): boolean {
  if (entry.type === 'folder') return false
  const ext = entry.ext?.toLowerCase()
  return !!ext && PLAYABLE_EXTS.includes(ext)
}

// File interaction handlers
function handleOpen(entry: ApiFileEntry) {
  if (isEditableText(entry.ext) && entry.blobKey) {
    openMarkdownDrawer(entry, 'edit')
  } else if (isPlayable(entry) && entry.blobKey) {
    viewerFile.value = entry
  } else {
    openItem(entry)
  }
}

const selectedEntry = ref<ApiFileEntry | null>(null)

function handleSelect(entry: ApiFileEntry) {
  selectedEntry.value = entry
  selectItem(entry)
  if (isEditableText(entry.ext) && entry.blobKey) {
    openMarkdownDrawer(entry, 'view')
  } else if (entry.type !== 'folder') {
    previewPinned.value = true
  }
}

const selectedFile = computed(() => {
  if (!selectedId.value) return null
  if (selectedEntry.value && selectedEntry.value.id === selectedId.value) {
    return selectedEntry.value
  }
  return items.value.find(f => f.id === selectedId.value) ?? null
})

const showPreview = computed(
  () =>
    previewPinned.value
    && selectedFile.value
    && selectedFile.value.type !== 'folder'
)

const canCreate = computed(() => !!currentSpaceId.value || spaces.value.length > 0)

// Track onboarding milestones
watch(uploading, (current, prev) => {
  // Fires when an upload finishes
  if (!current && prev) completeStep('uploadFile')
})

watch(previewPinned, (val) => {
  if (val) completeStep('usePreview')
})

async function createNote() {
  const name = `Untitled Note ${new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}`
  const blob = new Blob(['# ' + name + '\n'], { type: 'text/markdown' })
  const file = new File([blob], `${name}.md`, { type: 'text/markdown' })
  await uploadFiles([file])
  const created = items.value.find(f => f.name === name && f.ext === '.md')
  if (created) openMarkdownDrawer(created, 'edit')
}

const toolbarRef = ref<{ triggerUpload: () => void } | null>(null)

const newMenuItems = computed(() => [
  [
    {
      label: 'New Note',
      icon: 'i-lucide-file-text',
      disabled: !canCreate.value,
      onSelect: () => createNote()
    },
    {
      label: 'New Folder',
      icon: 'i-lucide-folder-plus',
      disabled: !currentSpaceId.value,
      onSelect: () => {
        showNewFolder.value = true
      }
    },
    {
      label: 'Upload File',
      icon: 'i-lucide-upload',
      disabled: !canCreate.value,
      onSelect: () => toolbarRef.value?.triggerUpload()
    }
  ]
])

// Resizable preview panel
const PREVIEW_WIDTH_KEY = 'storage:preview-width'
const MIN_PREVIEW = 240
const savedWidth = import.meta.client
  ? Number(localStorage.getItem(PREVIEW_WIDTH_KEY)) || 320
  : 320
const previewWidth = ref(savedWidth)

function startPreviewResize(e: MouseEvent) {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = previewWidth.value

  const onMove = (ev: MouseEvent) => {
    const delta = startX - ev.clientX
    const maxWidth = Math.floor(window.innerWidth * 0.7)
    previewWidth.value = Math.max(
      MIN_PREVIEW,
      Math.min(maxWidth, startWidth + delta)
    )
  }

  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    localStorage.setItem(PREVIEW_WIDTH_KEY, String(previewWidth.value))
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
</script>

<template>
  <div class="contents">
    <div class="flex flex-1 min-w-0 h-full">
      <div
        ref="panelRef"
        class="flex-1 min-w-0 flex flex-col"
      >
        <UDashboardPanel class="flex-1 min-w-0">
          <template #header>
            <StorageToolbar
              ref="toolbarRef"
              v-model:view-mode="viewMode"
              v-model:preview-pinned="previewPinned"
              v-model:sidebar-open="sidebarOpen"
              v-model:sidebar-collapsed="sidebarCollapsed"
              :breadcrumb-items="breadcrumbItems"
              :view-modes="viewModes"
              :column-toggle-items="columnToggleItems"
              :navbar-compact="navbarCompact"
              :hide-button-labels="hideButtonLabels"
              :uploading="uploading"
              :can-create="canCreate"
              :new-menu-items="newMenuItems"
              @upload="uploadFiles($event)"
            />
          </template>

          <template #body>
            <div class="flex flex-col min-h-full">
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
                    v-for="tag in tags"
                    :key="tag.id"
                    class="flex items-center gap-3 p-4 rounded-lg border border-default hover:border-muted hover:bg-elevated transition-colors text-left"
                    @click="navigateTo(`/tags/${tag.id}`)"
                  >
                    <span
                      class="size-3 rounded-full shrink-0"
                      :style="{ background: tag.color }"
                    />
                    <span class="text-sm font-medium text-default">{{ tag.label }}</span>
                  </button>
                </div>
              </div>

              <!-- Loading skeleton -->
              <div
                v-else-if="loading"
                class="flex-1 overflow-auto px-3.5"
              >
                <div class="space-y-1 py-2">
                  <div
                    v-for="i in 8"
                    :key="i"
                    class="flex items-center gap-3 px-3 py-2.5 rounded-md"
                  >
                    <USkeleton class="size-5 rounded" />
                    <USkeleton class="h-4 flex-1 max-w-64 rounded" />
                    <USkeleton class="h-3 w-20 rounded ml-auto" />
                    <USkeleton class="h-3 w-14 rounded" />
                  </div>
                </div>
              </div>

              <!-- File list -->
              <div
                v-else-if="viewMode === 'list'"
                class="flex-1 overflow-auto px-3.5"
              >
                <div
                  class="grid px-3 py-2 text-xs font-semibold text-dimmed uppercase tracking-wider border-b border-default sticky top-0 bg-default z-10"
                  :style="listGridStyle"
                >
                  <span>Name</span>
                  <span v-if="visibleColumnKeys.includes('members')">Members</span>
                  <span v-if="visibleColumnKeys.includes('modified')">Modified</span>
                  <span v-if="visibleColumnKeys.includes('size')">Size</span>
                  <div class="flex justify-end">
                    <UDropdownMenu
                      :items="columnToggleItems"
                      :content="{ align: 'end' as const }"
                    >
                      <UButton
                        icon="i-lucide-settings-2"
                        variant="ghost"
                        color="neutral"
                        size="xs"
                        title="Toggle columns"
                        @click.stop
                      />
                    </UDropdownMenu>
                  </div>
                </div>

                <FileListItem
                  v-for="file in items"
                  :key="file.id"
                  :file="file"
                  :selected="selectedId === file.id"
                  :visible-columns="visibleColumnKeys"
                  :grid-style="listGridStyle"
                  @select="handleSelect"
                  @open="handleOpen"
                  @manage-tags="openTagModal"
                  @share="(f) => shareModalRef?.show(f)"
                />

                <!-- Home: empty -->
                <div
                  v-if="items.length === 0 && special === 'home'"
                  class="py-8 px-2"
                >
                  <!-- Quick actions -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                    <button
                      class="flex flex-col items-center gap-2 p-4 rounded-lg border border-default hover:border-primary/40 hover:bg-elevated transition-colors group"
                      @click="toolbarRef?.triggerUpload()"
                    >
                      <div class="size-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <UIcon
                          name="i-lucide-upload"
                          class="size-5 text-primary"
                        />
                      </div>
                      <span class="text-sm font-medium text-default">{{ t.home.quickActions.items.upload.label }}</span>
                      <span class="text-xs text-dimmed">{{ t.home.quickActions.items.upload.description }}</span>
                    </button>
                    <button
                      class="flex flex-col items-center gap-2 p-4 rounded-lg border border-default hover:border-primary/40 hover:bg-elevated transition-colors group"
                      @click="createNote()"
                    >
                      <div class="size-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <UIcon
                          name="i-lucide-file-text"
                          class="size-5 text-primary"
                        />
                      </div>
                      <span class="text-sm font-medium text-default">{{ t.home.quickActions.items.newNote.label }}</span>
                      <span class="text-xs text-dimmed">{{ t.home.quickActions.items.newNote.description }}</span>
                    </button>
                    <button
                      v-if="spaces.length === 0"
                      class="flex flex-col items-center gap-2 p-4 rounded-lg border border-default hover:border-primary/40 hover:bg-elevated transition-colors group"
                      @click="navigateTo('/home')"
                    >
                      <div class="size-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <UIcon
                          name="i-lucide-layers"
                          class="size-5 text-primary"
                        />
                      </div>
                      <span class="text-sm font-medium text-default">{{ t.home.quickActions.items.createSpace.label }}</span>
                      <span class="text-xs text-dimmed">{{ t.home.quickActions.items.createSpace.description }}</span>
                    </button>
                    <button
                      v-else
                      class="flex flex-col items-center gap-2 p-4 rounded-lg border border-default hover:border-primary/40 hover:bg-elevated transition-colors group"
                      @click="navigateToSpace(spaces[0]!.id)"
                    >
                      <div class="size-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <UIcon
                          name="i-lucide-folder-open"
                          class="size-5 text-primary"
                        />
                      </div>
                      <span class="text-sm font-medium text-default">{{ t.home.quickActions.items.browse.label }}</span>
                      <span class="text-xs text-dimmed">{{ t.home.quickActions.items.browse.description }}</span>
                    </button>
                    <button
                      class="flex flex-col items-center gap-2 p-4 rounded-lg border border-default hover:border-primary/40 hover:bg-elevated transition-colors group"
                      @click="navigateTo('/starred')"
                    >
                      <div class="size-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <UIcon
                          name="i-lucide-star"
                          class="size-5 text-primary"
                        />
                      </div>
                      <span class="text-sm font-medium text-default">Starred</span>
                      <span class="text-xs text-dimmed">Your pinned favourites</span>
                    </button>
                  </div>

                  <EmptyState
                    icon="i-lucide-cloud"
                    :title="t.home.empty.title"
                    :description="t.home.empty.description"
                  />
                  <div class="max-w-sm mx-auto mt-6">
                    <OnboardingChecklist />
                  </div>
                </div>

                <!-- Home: populated — quick actions above recent files -->
                <template v-else-if="items.length > 0 && special === 'home'">
                  <div class="px-2 pb-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <button
                        class="flex items-center gap-2.5 p-3 rounded-lg border border-default hover:border-primary/40 hover:bg-elevated transition-colors group"
                        @click="toolbarRef?.triggerUpload()"
                      >
                        <div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <UIcon
                            name="i-lucide-upload"
                            class="size-4 text-primary"
                          />
                        </div>
                        <span class="text-sm font-medium text-default">Upload</span>
                      </button>
                      <button
                        class="flex items-center gap-2.5 p-3 rounded-lg border border-default hover:border-primary/40 hover:bg-elevated transition-colors group"
                        @click="createNote()"
                      >
                        <div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <UIcon
                            name="i-lucide-file-text"
                            class="size-4 text-primary"
                          />
                        </div>
                        <span class="text-sm font-medium text-default">New note</span>
                      </button>
                      <button
                        class="flex items-center gap-2.5 p-3 rounded-lg border border-default hover:border-primary/40 hover:bg-elevated transition-colors group"
                        @click="spaces.length > 0 ? navigateToSpace(spaces[0]!.id) : undefined"
                      >
                        <div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <UIcon
                            name="i-lucide-folder-open"
                            class="size-4 text-primary"
                          />
                        </div>
                        <span class="text-sm font-medium text-default">Spaces</span>
                      </button>
                      <button
                        class="flex items-center gap-2.5 p-3 rounded-lg border border-default hover:border-primary/40 hover:bg-elevated transition-colors group"
                        @click="navigateTo('/starred')"
                      >
                        <div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <UIcon
                            name="i-lucide-star"
                            class="size-4 text-primary"
                          />
                        </div>
                        <span class="text-sm font-medium text-default">Starred</span>
                      </button>
                    </div>
                  </div>

                  <div class="px-5 pb-2">
                    <h2 class="text-xs font-semibold text-dimmed uppercase tracking-wider">
                      Recent files
                    </h2>
                  </div>
                </template>

                <!-- Recents: empty -->
                <div
                  v-else-if="items.length === 0 && special === 'recents'"
                  class="py-8 px-2"
                >
                  <EmptyState
                    icon="i-lucide-clock"
                    :title="t.recents.empty.title"
                    :description="t.recents.empty.description"
                  />
                  <div class="max-w-md mx-auto mt-6 flex flex-col items-center gap-4">
                    <p class="text-xs text-dimmed text-center">
                      {{ t.recents.empty.hint }}
                    </p>
                    <div class="flex gap-2">
                      <UButton
                        label="Upload a file"
                        icon="i-lucide-upload"
                        size="sm"
                        @click="toolbarRef?.triggerUpload()"
                      />
                      <UButton
                        label="Create a note"
                        icon="i-lucide-file-text"
                        variant="outline"
                        color="neutral"
                        size="sm"
                        @click="createNote()"
                      />
                    </div>
                  </div>
                </div>

                <!-- Starred: empty -->
                <div
                  v-else-if="items.length === 0 && special === 'starred'"
                  class="py-8 px-2"
                >
                  <EmptyState
                    icon="i-lucide-star"
                    :title="t.starred.empty.title"
                    :description="t.starred.empty.description"
                  />
                  <div class="max-w-md mx-auto mt-6 flex flex-col items-center gap-3">
                    <p class="text-xs text-dimmed text-center">
                      {{ t.starred.empty.hint }}
                    </p>
                    <UButton
                      v-if="spaces.length > 0"
                      label="Browse your files"
                      icon="i-lucide-folder-open"
                      size="sm"
                      variant="outline"
                      color="neutral"
                      @click="navigateToSpace(spaces[0]!.id)"
                    />
                  </div>
                </div>

                <!-- Trash: empty -->
                <UEmpty
                  v-else-if="items.length === 0 && special === 'trash'"
                  icon="i-lucide-trash-2"
                  title="Nothing here"
                  description="Trash is empty. Deleted files appear here for 30 days before being permanently removed."
                  class="py-20"
                />

                <!-- Shared: empty -->
                <UEmpty
                  v-else-if="items.length === 0 && special === 'shared'"
                  icon="i-lucide-share-2"
                  title="Nothing shared"
                  description="Files shared with you will appear here."
                  class="py-20"
                />

                <!-- Shared by me: empty -->
                <UEmpty
                  v-else-if="items.length === 0 && special === 'shared-by-me'"
                  icon="i-lucide-send"
                  title="Nothing shared yet"
                  description="Files you share with others will appear here."
                  class="py-20"
                />

                <!-- Generic folder: empty -->
                <UEmpty
                  v-else-if="items.length === 0"
                  icon="i-lucide-folder-open"
                  title="No files yet"
                  description="Upload files or create a folder to get started."
                  class="py-20"
                />
              </div>

              <!-- Grid view -->
              <FileGridView
                v-else-if="viewMode === 'grid'"
                :items="items"
                :selected-id="selectedId"
                @select="handleSelect"
                @open="handleOpen"
              />

              <!-- Columns view -->
              <ColumnsView
                v-else-if="viewMode === 'columns' && currentSpaceId"
                :space-id="currentSpaceId"
                :items="items"
                :folder-path="currentFolderPath"
                @select="handleSelect"
                @open="handleOpen"
                @moved="refreshFiles()"
              />

              <!-- Tree view -->
              <TreeView
                v-else-if="viewMode === 'tree' && currentSpaceId"
                :space-id="currentSpaceId"
                :items="items"
                @select="handleSelect"
                @open="handleOpen"
                @manage-tags="openTagModal"
              />
            </div>
          </template>
        </UDashboardPanel>
      </div>

      <UModal
        v-model:open="showNewFolder"
        title="New Folder"
        description="Create a folder in the current space."
      >
        <template #body>
          <UInput
            v-model="newFolderName"
            placeholder="Folder name"
            autofocus
            @keydown.enter="handleCreateFolder"
          />
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="showNewFolder = false"
            />
            <UButton
              label="Create"
              :loading="creatingFolder"
              :disabled="!newFolderName.trim()"
              @click="handleCreateFolder"
            />
          </div>
        </template>
      </UModal>

      <!-- Right drawer: preview or note editor -->
      <div
        v-if="(showPreview && selectedFile) || editorFile"
        class="shrink-0 relative flex"
        :style="{
          width:
            editorFile && noteEditorRef?.isSplitEdit
              ? `${previewWidth * 2}px`
              : `${previewWidth}px`
        }"
      >
        <div
          class="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-20 hover:bg-primary/30 active:bg-primary/50 transition-colors"
          @mousedown="startPreviewResize"
        />

        <NoteEditorDrawer
          v-if="editorFile"
          ref="noteEditorRef"
          :file="editorFile"
          :content="editorContent"
          :loading="editorLoading"
          :saving="editorSaving"
          @update:content="onEditorUpdate"
          @close="closeEditor"
          @share="openShareModal"
        />

        <FilePreview
          v-else-if="showPreview && selectedFile"
          :key="selectedFile.id"
          :file="selectedFile"
          class="flex-1 min-w-0"
          @close="
            selectedId = null;
            selectedEntry = null;
          "
          @share="openShareModal"
        />
      </div>
    </div>
    <TagManageModal
      ref="tagModalRef"
      :tags="tags"
    />
    <ShareModal ref="shareModalRef" />
    <MediaViewerModal v-model:file="viewerFile" />
    <UploadProgress
      :queue="uploadQueue"
      @dismiss="dismissUploadQueue()"
    />
  </div>
</template>
