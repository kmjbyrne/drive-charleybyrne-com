import { TREE, findNode, getPath, allFiles, allStarred, sortChildren } from '~/data'
import type { FileNode } from '~/data'

export type SpecialView = 'home' | 'recents' | 'starred' | 'shared' | 'trash' | 'tags' | null
export type ViewMode = 'list' | 'grid' | 'columns'

const pathIds = ref<string[]>(['root', 'personal', 'p-docs'])
const special = ref<SpecialView>(null)
const viewMode = ref<ViewMode>('list')
const selectedId = ref<string | null>('f-q4')
const previewPinned = ref(true)
const viewerFile = ref<FileNode | null>(null)
const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)

export function useStorage() {
  const path = computed<FileNode[]>(() => {
    const out: FileNode[] = [TREE]
    let cur: FileNode = TREE
    for (let i = 1; i < pathIds.value.length; i++) {
      const next = (cur.children || []).find(c => c.id === pathIds.value[i])
      if (!next) break
      out.push(next)
      cur = next
    }
    return out
  })

  const currentNode = computed(() => path.value[path.value.length - 1])

  const selected = computed<FileNode | null>(() => {
    if (!selectedId.value) return null
    return findNode(TREE, selectedId.value)
  })

  const items = computed<FileNode[]>(() => {
    if (special.value === 'starred') return sortChildren(allStarred(TREE))
    if (special.value === 'recents') return sortChildren(allFiles(TREE).slice(0, 12))
    if (special.value === 'shared') return sortChildren(allFiles(TREE).filter(f => f.members && f.members.length > 1).slice(0, 10))
    if (special.value === 'home') return sortChildren(allFiles(TREE).slice(0, 10))
    if (special.value === 'trash') return []
    return sortChildren(currentNode.value.children || [])
  })

  const starredCount = computed(() => allStarred(TREE).length)

  function navigateToId(id: string) {
    special.value = null
    const trail = getPath(TREE, id)
    if (trail) pathIds.value = trail.map(n => n.id)
  }

  function navigateToPath(trailIds: string[]) {
    special.value = null
    pathIds.value = trailIds
  }

  function setSpecial(view: SpecialView) {
    special.value = view
    selectedId.value = null
  }

  function selectItem(node: FileNode) {
    selectedId.value = node.id
  }

  function openItem(node: FileNode) {
    if (node.type === 'folder' || node.type === 'space') {
      const trail = getPath(TREE, node.id)
      if (trail) {
        special.value = null
        pathIds.value = trail.map(n => n.id)
        selectedId.value = null
      }
    }
    else {
      selectedId.value = node.id
      // Open DOCX files with mockFile in the viewer
      if (node.mockFile && node.ext === '.docx') {
        viewerFile.value = node
      }
    }
  }

  return {
    path,
    pathIds,
    special,
    viewMode,
    selectedId,
    selected,
    currentNode,
    items,
    previewPinned,
    viewerFile,
    sidebarOpen,
    sidebarCollapsed,
    starredCount,
    navigateToId,
    navigateToPath,
    setSpecial,
    selectItem,
    openItem
  }
}
