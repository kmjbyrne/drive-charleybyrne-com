<script setup lang="ts">
import type { ApiFileEntry } from '~/composables/useStorage'

const props = defineProps<{
  spaceId: string
  items: ApiFileEntry[]
  folderPath: string[]
}>()

const emit = defineEmits<{
  open: [entry: ApiFileEntry]
  select: [entry: ApiFileEntry]
  moved: []
}>()

const { moveFile } = useStorage()

const {
  visible: folderStatsVisible,
  stats: folderStats,
  loading: folderStatsLoading,
  onMouseEnter: folderMouseEnter,
  onMouseLeave: folderMouseLeave
} = useFolderStats()

interface Column {
  parentId: string | null
  parentName: string | null
  items: ApiFileEntry[]
  selectedId: string | null
}

const extraColumns = ref<Column[]>([])
const scrollContainer = ref<HTMLElement | null>(null)
const dragEntryId = ref<string | null>(null)
const dragSourceColIndex = ref<number | null>(null)
const dropTargetId = ref<string | null>(null)

const columns = computed<Column[]>(() => {
  const root: Column = {
    parentId: null,
    parentName: null,
    items: props.items,
    selectedId: extraColumns.value.length > 0
      ? findParentInItems(props.items, extraColumns.value[0]?.items || [])
      : null
  }
  return [root, ...extraColumns.value]
})

function findParentInItems(parentItems: ApiFileEntry[], childItems: ApiFileEntry[]): string | null {
  if (childItems.length === 0) return null
  const firstChild = childItems[0]
  if (!firstChild) return null
  const parent = parentItems.find(i => i.id === firstChild.parentId)
  return parent?.id ?? null
}

function sortItems(arr: ApiFileEntry[]): ApiFileEntry[] {
  return [...arr].sort((a, b) => {
    const af = a.type === 'folder' ? 0 : 1
    const bf = b.type === 'folder' ? 0 : 1
    if (af !== bf) return af - bf
    return a.name.localeCompare(b.name)
  })
}

async function handleClick(entry: ApiFileEntry, colIndex: number) {
  extraColumns.value = extraColumns.value.slice(0, colIndex)

  if (entry.type === 'folder') {
    const children = await $fetch<ApiFileEntry[]>('/api/storage/files', {
      query: {
        spaceId: props.spaceId,
        parentId: entry.id
      }
    })

    extraColumns.value.push({
      parentId: entry.id,
      parentName: entry.name,
      items: sortItems(children || []),
      selectedId: null
    })

    updateSelection(colIndex, entry.id)

    nextTick(() => {
      scrollContainer.value?.scrollTo({
        left: scrollContainer.value.scrollWidth,
        behavior: 'smooth'
      })
    })
  } else {
    updateSelection(colIndex, entry.id)
    emit('select', entry)
  }
}

function updateSelection(colIndex: number, entryId: string) {
  if (colIndex === 0) return
  const col = extraColumns.value[colIndex - 1]
  if (col) {
    col.selectedId = entryId
  }
}

function handleDblClick(entry: ApiFileEntry) {
  emit('open', entry)
}

function isSelected(entry: ApiFileEntry, colIndex: number): boolean {
  if (colIndex === 0) {
    const nextCol = extraColumns.value[0]
    if (!nextCol || nextCol.items.length === 0) return false
    return nextCol.items[0]?.parentId === entry.id
  }
  const col = extraColumns.value[colIndex - 1]
  return col?.selectedId === entry.id
}

// Drag and drop
function onDragStart(event: DragEvent, entry: ApiFileEntry, colIndex: number) {
  if (!event.dataTransfer) return
  dragEntryId.value = entry.id
  dragSourceColIndex.value = colIndex
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', entry.id)
}

function onDragEnd() {
  dragEntryId.value = null
  dragSourceColIndex.value = null
  dropTargetId.value = null
}

function onDragOver(event: DragEvent, entry: ApiFileEntry) {
  if (!dragEntryId.value) return
  // Only allow dropping on folders, and not on itself
  if (entry.type !== 'folder' || entry.id === dragEntryId.value) return
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dropTargetId.value = entry.id
}

function onDragOverColumn(event: DragEvent, _col: Column) {
  // Allow dropping on the column background to move to that column's parent
  if (!dragEntryId.value) return
  event.preventDefault()
}

function onDragLeave(event: DragEvent, entry: ApiFileEntry) {
  if (dropTargetId.value === entry.id) {
    dropTargetId.value = null
  }
}

async function onDrop(event: DragEvent, targetEntry: ApiFileEntry, colIndex: number) {
  event.preventDefault()
  const sourceId = dragEntryId.value
  const sourceColIndex = dragSourceColIndex.value
  if (!sourceId || targetEntry.type !== 'folder' || targetEntry.id === sourceId) return

  dragEntryId.value = null
  dragSourceColIndex.value = null
  dropTargetId.value = null

  await moveFile(sourceId, targetEntry.id)

  // Refresh the source column so the dragged item disappears
  if (sourceColIndex === 0) {
    emit('moved')
  } else if (sourceColIndex !== null) {
    await refreshColumn(sourceColIndex)
  }

  // Refresh the target column if different from source
  if (colIndex !== sourceColIndex) {
    if (colIndex === 0) {
      emit('moved')
    } else {
      await refreshColumn(colIndex)
    }
  }

  // If the target folder is currently expanded, refresh it too
  const targetColIndex = extraColumns.value.findIndex(c => c.parentId === targetEntry.id)
  if (targetColIndex >= 0) {
    await refreshColumn(targetColIndex + 1)
  }
}

async function onDropOnColumn(event: DragEvent, colIndex: number) {
  event.preventDefault()
  const sourceId = dragEntryId.value
  const col = columns.value[colIndex]
  if (!sourceId || !col) return

  dragEntryId.value = null
  dragSourceColIndex.value = null
  dropTargetId.value = null

  // Move file to this column's parent
  await moveFile(sourceId, col.parentId)

  // Refresh all non-root columns and emit for root
  emit('moved')
  for (let i = 1; i < columns.value.length; i++) {
    await refreshColumn(i)
  }
}

async function refreshColumn(colIndex: number) {
  if (colIndex === 0) {
    // Root column is controlled by the parent — just re-render
    return
  }
  const col = extraColumns.value[colIndex - 1]
  if (!col || !col.parentId) return

  const children = await $fetch<ApiFileEntry[]>('/api/storage/files', {
    query: {
      spaceId: props.spaceId,
      parentId: col.parentId
    }
  })
  col.items = sortItems(children || [])
}

watch(() => props.items, () => {
  extraColumns.value = []
})
</script>

<template>
  <div
    ref="scrollContainer"
    class="flex-1 flex overflow-x-auto"
  >
    <div
      v-for="(col, colIndex) in columns"
      :key="colIndex"
      class="flex-none w-56 border-r border-default overflow-y-auto"
      @dragover="onDragOverColumn($event, col)"
      @drop="onDropOnColumn($event, colIndex)"
    >
      <div
        v-for="entry in col.items"
        :key="entry.id"
        :class="[
          'flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm transition-colors relative',
          isSelected(entry, colIndex) ? 'bg-primary/10 text-default' : 'text-muted hover:bg-elevated',
          dropTargetId === entry.id ? 'ring-2 ring-primary ring-inset rounded' : '',
          dragEntryId === entry.id ? 'opacity-40' : ''
        ]"
        draggable="true"
        @click="handleClick(entry, colIndex)"
        @dblclick="handleDblClick(entry)"
        @mouseenter="entry.type === 'folder' && folderMouseEnter(entry.id)"
        @mouseleave="entry.type === 'folder' && folderMouseLeave()"
        @dragstart="onDragStart($event, entry, colIndex)"
        @dragend="onDragEnd"
        @dragover="onDragOver($event, entry)"
        @dragleave="onDragLeave($event, entry)"
        @drop.stop="onDrop($event, entry, colIndex)"
      >
        <FolderHoverStats
          v-if="entry.type === 'folder'"
          :visible="folderStatsVisible"
          :loading="folderStatsLoading"
          :stats="folderStats"
        />
        <FileIcon
          :type="deriveFileType(entry.ext, entry.type)"
          :ext="entry.ext"
          size="xs"
        />
        <span class="flex-1 truncate">
          {{ entry.name }}<span
            v-if="entry.ext"
            class="text-dimmed"
          >{{ entry.ext }}</span>
        </span>
        <UIcon
          v-if="entry.type === 'folder'"
          name="i-lucide-chevron-right"
          class="size-3 text-dimmed shrink-0"
        />
      </div>

      <div
        v-if="col.items.length === 0"
        class="px-3 py-4 text-xs text-dimmed text-center"
      >
        Empty
      </div>
    </div>
  </div>
</template>
