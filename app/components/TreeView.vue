<script setup lang="ts">
import type { ApiFileEntry } from '~/composables/useStorage'

const props = defineProps<{
  spaceId: string
  items: ApiFileEntry[]
}>()

const emit = defineEmits<{
  open: [entry: ApiFileEntry]
  select: [entry: ApiFileEntry]
  manageTags: [entry: ApiFileEntry]
}>()

const { removeFromFiles } = useStorage()

function sortItems(arr: ApiFileEntry[]): ApiFileEntry[] {
  return [...arr].sort((a, b) => {
    const af = a.type === 'folder' ? 0 : 1
    const bf = b.type === 'folder' ? 0 : 1
    if (af !== bf) return af - bf
    return a.name.localeCompare(b.name)
  })
}

const sortedItems = computed(() => sortItems(props.items))

// Registry of all mounted TreeNode removal callbacks, keyed by folder id.
// When a file is moved, we call the source folder's remover so it disappears
// from the correct subtree — even if the source is a sibling, not an ancestor.
const nodeRemovers = new Map<string, (fileId: string) => void>()

function registerRemover(folderId: string, fn: (fileId: string) => void) {
  nodeRemovers.set(folderId, fn)
}

function unregisterRemover(folderId: string) {
  nodeRemovers.delete(folderId)
}

function removeFromNode(parentId: string | null, fileId: string) {
  if (!parentId) {
    // Root-level item — remove from the composable's filesData
    removeFromFiles(fileId)
    return
  }
  const remover = nodeRemovers.get(parentId)
  if (remover) remover(fileId)
}

provide('treeNodeRemovers', { registerRemover, unregisterRemover, removeFromNode })

function handleMoved(fileId: string) {
  removeFromFiles(fileId)
}
</script>

<template>
  <div class="flex-1 overflow-auto px-3.5 py-2">
    <TreeNode
      v-for="(entry, idx) in sortedItems"
      :key="entry.id"
      :entry="entry"
      :space-id="spaceId"
      :depth="0"
      :is-last="idx === sortedItems.length - 1"
      :ancestor-is-last="[]"
      @open="emit('open', $event)"
      @select="emit('select', $event)"
      @manage-tags="emit('manageTags', $event)"
      @moved="handleMoved"
    />
    <UEmpty
      v-if="sortedItems.length === 0"
      icon="i-lucide-folder-open"
      title="Empty"
      description="No files or folders here."
      class="py-20"
    />
  </div>
</template>
