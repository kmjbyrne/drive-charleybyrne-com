<script setup lang="ts">
import type { ApiFileEntry } from '~/composables/useStorage'

const props = defineProps<{
  entry: ApiFileEntry
  spaceId: string
  depth: number
  isLast?: boolean
  // Tracks which ancestor levels are "last" (no vertical continuation line)
  ancestorIsLast?: boolean[]
}>()

const emit = defineEmits<{
  open: [entry: ApiFileEntry]
  select: [entry: ApiFileEntry]
  manageTags: [entry: ApiFileEntry]
  moved: [fileId: string]
}>()

const { toggleStar, renameFile, deleteFile, createFolder, moveFile } = useStorage()

const { registerRemover, unregisterRemover, removeFromNode } = inject<{
  registerRemover: (id: string, fn: (fileId: string) => void) => void
  unregisterRemover: (id: string) => void
  removeFromNode: (parentId: string | null, fileId: string) => void
}>('treeNodeRemovers')!

const isFolder = computed(() => props.entry.type === 'folder')

const {
  visible: folderStatsVisible,
  stats: folderStats,
  loading: folderStatsLoading,
  onMouseEnter: folderMouseEnter,
  onMouseLeave: folderMouseLeave
} = useFolderStats()
const expanded = ref(false)
const children = ref<ApiFileEntry[]>([])
const loading = ref(false)
const loaded = ref(false)
const dragOver = ref(false)

// Register this folder so siblings can remove children from it
if (isFolder.value) {
  registerRemover(props.entry.id, (fileId: string) => {
    children.value = children.value.filter(c => c.id !== fileId)
  })
  onUnmounted(() => unregisterRemover(props.entry.id))
}

const renaming = ref(false)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement | null>(null)

function startRename() {
  renameValue.value = props.entry.name
  renaming.value = true
  nextTick(() => {
    renameInput.value?.focus()
    renameInput.value?.select()
  })
}

async function commitRename() {
  const trimmed = renameValue.value.trim()
  renaming.value = false
  if (!trimmed || trimmed === props.entry.name) return
  // Optimistically update the local entry so the tree re-renders immediately
  ;(props.entry as ApiFileEntry).name = trimmed
  await renameFile(props.entry.id, trimmed)
}

function cancelRename() {
  renaming.value = false
}

async function handleNewFolder() {
  const name = prompt('New folder name')
  if (!name?.trim()) return
  await createFolder(name.trim(), props.entry.id)
}

async function handleToggleStar() {
  const newVal = !props.entry.starred
  ;(props.entry as ApiFileEntry).starred = newVal
  await toggleStar(props.entry.id, newVal)
}

function sortItems(arr: ApiFileEntry[]): ApiFileEntry[] {
  return [...arr].sort((a, b) => {
    const af = a.type === 'folder' ? 0 : 1
    const bf = b.type === 'folder' ? 0 : 1
    if (af !== bf) return af - bf
    return a.name.localeCompare(b.name)
  })
}

async function toggle() {
  if (!isFolder.value) return

  if (!loaded.value) {
    loading.value = true
    try {
      const result = await $fetch<ApiFileEntry[]>('/api/storage/files', {
        query: {
          spaceId: props.spaceId,
          parentId: props.entry.id
        }
      })
      children.value = sortItems(result || [])
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  expanded.value = !expanded.value
}

function handleClick() {
  emit('select', props.entry)
  if (isFolder.value) {
    toggle()
  }
}

const isMarkdown = computed(() => {
  const ext = props.entry.ext?.toLowerCase()
  return ext === '.md' || ext === '.mdx'
})

// Drag and drop
function onDragStart(e: DragEvent) {
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('application/x-file-id', props.entry.id)
  e.dataTransfer!.setData('application/x-parent-id', props.entry.parentId || '')
}

function onDragOver(e: DragEvent) {
  if (!isFolder.value) return
  const draggedId = e.dataTransfer!.types.includes('application/x-file-id')
  if (!draggedId) return
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

async function onDrop(e: DragEvent) {
  dragOver.value = false
  if (!isFolder.value) return
  e.preventDefault()

  const fileId = e.dataTransfer!.getData('application/x-file-id')
  const sourceParentId = e.dataTransfer!.getData('application/x-parent-id') || null
  if (!fileId || fileId === props.entry.id) return

  await moveFile(fileId, props.entry.id)

  // Remove the item from its source folder (works across siblings)
  removeFromNode(sourceParentId, fileId)

  // Reload this folder's children to show the moved item
  if (loaded.value) {
    const result = await $fetch<ApiFileEntry[]>('/api/storage/files', {
      query: { spaceId: props.spaceId, parentId: props.entry.id }
    })
    children.value = sortItems(result || [])
  }
  if (!expanded.value) {
    await toggle()
  }
}

// Legacy handler — kept for backward compat but removal is now handled by the registry
function handleChildMoved(_fileId: string) {
  // No-op: removeFromNode in the registry handles cross-sibling removal
}
</script>

<template>
  <div>
    <UContextMenu
      :items="[
        [
          { label: 'Open', icon: 'i-lucide-eye', onSelect: () => emit('open', entry) },
          ...(isFolder ? [{ label: 'New folder', icon: 'i-lucide-folder-plus', onSelect: () => handleNewFolder() }] : []),
          { label: entry.starred ? 'Unstar' : 'Star', icon: 'i-lucide-star', onSelect: () => handleToggleStar() },
          { label: 'Tags...', icon: 'i-lucide-tags', onSelect: () => emit('manageTags', entry) },
          { label: 'Rename', icon: 'i-lucide-pencil', onSelect: () => startRename() }
        ],
        [
          { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => deleteFile(entry.id) }
        ]
      ]"
    >
      <div
        :class="[
          'relative flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer hover:bg-elevated transition-colors group/node',
          dragOver && 'ring-2 ring-primary bg-primary/10'
        ]"
        :style="{ paddingLeft: `${depth * 20 + 8}px` }"
        draggable="true"
        @click="handleClick"
        @dblclick="emit('open', entry)"
        @mouseenter="isFolder && folderMouseEnter(entry.id)"
        @mouseleave="isFolder && folderMouseLeave()"
        @dragstart="onDragStart"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <!-- ASCII tree connectors -->
        <template v-if="depth > 0">
          <!-- Vertical continuation lines for ancestors -->
          <span
            v-for="i in (depth - 1)"
            :key="'guide-' + i"
            class="absolute top-0 bottom-0 pointer-events-none"
            :style="{ left: `${i * 20 + 12}px` }"
          >
            <span
              v-if="!(ancestorIsLast?.[i])"
              class="absolute inset-y-0 left-0 border-l border-slate-300 dark:border-slate-600"
            />
          </span>
          <!-- Branch connector: └ or ├ -->
          <span
            class="absolute top-0 bottom-0 pointer-events-none"
            :style="{ left: `${(depth - 1) * 20 + 12}px` }"
          >
            <!-- Vertical segment -->
            <span
              class="absolute left-0 top-0 border-l border-slate-300 dark:border-slate-600"
              :style="{ height: isLast ? '50%' : '100%' }"
            />
            <!-- Horizontal segment -->
            <span
              class="absolute left-0 border-t border-slate-300 dark:border-slate-600"
              style="top: 50%; width: 10px"
            />
          </span>
        </template>

        <button
          v-if="isFolder"
          class="shrink-0 size-4 flex items-center justify-center"
          @click.stop="toggle"
        >
          <UIcon
            v-if="loading"
            name="i-lucide-loader-2"
            class="size-3 text-muted animate-spin"
          />
          <UIcon
            v-else
            :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            class="size-3 text-muted"
          />
        </button>
        <span
          v-else
          class="shrink-0 size-4"
        />

        <FolderHoverStats
          v-if="isFolder"
          :visible="folderStatsVisible"
          :loading="folderStatsLoading"
          :stats="folderStats"
        />
        <FileIcon
          :type="deriveFileType(entry.ext, entry.type)"
          :ext="entry.ext"
          size="sm"
        />

        <input
          v-if="renaming"
          ref="renameInput"
          v-model="renameValue"
          class="text-sm font-medium text-default bg-transparent border border-primary rounded px-1 py-0.5 flex-1 outline-none"
          @keydown.enter="commitRename"
          @keydown.escape="cancelRename"
          @blur="commitRename"
          @click.stop
          @dblclick.stop
        >
        <span
          v-else
          class="text-sm text-default truncate"
        >
          {{ entry.name }}<span
            v-if="entry.ext && !isMarkdown"
            class="text-dimmed font-normal"
          >{{ entry.ext }}</span>
        </span>

        <!-- Hover actions (adjacent to name) -->
        <div class="shrink-0 flex items-center gap-0.5 opacity-0 group-hover/node:opacity-100 transition-opacity">
          <button
            class="p-0.5 rounded hover:bg-elevated transition-colors"
            :title="entry.starred ? 'Unstar' : 'Star'"
            @click.stop="handleToggleStar"
          >
            <UIcon
              name="i-lucide-star"
              :class="['size-3', entry.starred ? 'text-yellow-500' : 'text-dimmed']"
            />
          </button>
          <button
            class="p-0.5 rounded hover:bg-elevated transition-colors"
            title="Open"
            @click.stop="emit('open', entry)"
          >
            <UIcon
              name="i-lucide-eye"
              class="size-3 text-dimmed"
            />
          </button>
          <UDropdownMenu
            :items="[
              [
                ...(isFolder ? [{ label: 'New folder', icon: 'i-lucide-folder-plus', onSelect: () => handleNewFolder() }] : []),
                { label: 'Tags...', icon: 'i-lucide-tags', onSelect: () => emit('manageTags', entry) },
                { label: 'Rename', icon: 'i-lucide-pencil', onSelect: () => startRename() }
              ],
              [
                { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => deleteFile(entry.id) }
              ]
            ]"
          >
            <button
              class="p-0.5 rounded hover:bg-elevated transition-colors"
              title="More actions"
              @click.stop
            >
              <UIcon
                name="i-lucide-ellipsis"
                class="size-3 text-dimmed"
              />
            </button>
          </UDropdownMenu>
        </div>

        <UIcon
          v-if="entry.starred"
          name="i-lucide-star"
          class="size-3 text-yellow-500 shrink-0 group-hover/node:hidden"
        />
      </div>
    </UContextMenu>

    <div v-if="isFolder && expanded && loaded">
      <TreeNode
        v-for="(child, idx) in children"
        :key="child.id"
        :entry="child"
        :space-id="spaceId"
        :depth="depth + 1"
        :is-last="idx === children.length - 1"
        :ancestor-is-last="[...(ancestorIsLast || []), !!isLast]"
        @open="emit('open', $event)"
        @select="emit('select', $event)"
        @manage-tags="emit('manageTags', $event)"
        @moved="handleChildMoved"
      />
      <div
        v-if="children.length === 0"
        class="relative text-xs text-muted py-1"
        :style="{ paddingLeft: `${(depth + 1) * 20 + 28}px` }"
      >
        Empty folder
      </div>
    </div>
  </div>
</template>
