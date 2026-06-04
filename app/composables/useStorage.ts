export type SpecialView = 'home' | 'recents' | 'starred' | 'shared' | 'shared-by-me' | 'trash' | 'tags' | null
export type ViewMode = 'list' | 'grid' | 'columns' | 'tree'

export interface ApiSpace {
  id: string
  name: string
  icon: string
  color: string
  ownerId: string
  createdAt: string
}

export interface ApiFileEntry {
  id: string
  parentId: string | null
  spaceId: string
  name: string
  type: 'folder' | 'file'
  mimeType: string | null
  ext: string | null
  sizeBytes: number
  blobKey: string | null
  ownerId: string
  starred: boolean
  trashedAt: string | null
  createdAt: string
  modifiedAt: string
}

export interface ApiTag {
  id: string
  label: string
  color: string
}

export interface BreadcrumbNode {
  id: string
  name: string
  type: 'space' | 'folder'
}

interface ResolveResult {
  parentId: string | null
  trail: BreadcrumbNode[]
}

const special = ref<SpecialView>(null)
const viewMode = ref<ViewMode>('list')
const selectedId = ref<string | null>(null)
const previewPinned = ref(true)
const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)

// Multi-select state
const selectedIds = ref<Set<string>>(new Set())
const lastClickedId = ref<string | null>(null)
export interface UploadItem {
  id: string
  fileName: string
  fileSize: number
  // 0–100
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

const uploadQueue = ref<UploadItem[]>([])
const uploading = computed(() => uploadQueue.value.some(u => u.status === 'pending' || u.status === 'uploading'))
// Optimistic entries shown immediately while upload is in progress
const optimisticEntries = ref<ApiFileEntry[]>([])

// Current navigation context
const currentSpaceId = ref<string | null>(null)
const currentParentId = ref<string | null>(null)
const currentTagId = ref<string | null>(null)
// Folder name segments for the current path (used to build URLs)
const currentFolderPath = ref<string[]>([])
const breadcrumb = ref<BreadcrumbNode[]>([])

const filesData = ref<ApiFileEntry[]>([])
const filesLoading = ref(false)
const starredData = ref<ApiFileEntry[]>([])
const starredLoading = ref(false)
const recentData = ref<ApiFileEntry[]>([])
const recentLoading = ref(false)
const tagFilesData = ref<ApiFileEntry[]>([])
const trashData = ref<ApiFileEntry[]>([])
const trashLoading = ref(false)
const sharedByMeData = ref<ApiFileEntry[]>([])
const sharedByMeLoading = ref(false)
const sharedWithMeData = ref<ApiFileEntry[]>([])
const sharedWithMeLoading = ref(false)

// During SSR, $fetch to internal server routes doesn't carry the browser's
// cookies automatically. We need to forward them from the incoming request.
function ssrHeaders(): Record<string, string> {
  if (!import.meta.server) return {}
  return useRequestHeaders(['cookie']) as Record<string, string>
}

export function useStorage() {
  const { data: spaces, refresh: refreshSpaces } = useFetch<ApiSpace[]>('/api/storage/spaces', {
    default: () => []
  })

  const { data: tags, refresh: refreshTags } = useFetch<ApiTag[]>('/api/storage/tags', {
    default: () => []
  })

  async function refreshFiles() {
    if (!currentSpaceId.value) return
    filesLoading.value = true
    try {
      filesData.value = await $fetch<ApiFileEntry[]>('/api/storage/files', {
        headers: ssrHeaders(),
        query: {
          spaceId: currentSpaceId.value,
          parentId: currentParentId.value || ''
        }
      })
    } finally {
      filesLoading.value = false
    }
  }

  async function refreshStarred() {
    starredLoading.value = true
    try {
      starredData.value = await $fetch<ApiFileEntry[]>('/api/storage/starred', {
        headers: ssrHeaders()
      })
    } finally {
      starredLoading.value = false
    }
  }

  async function refreshRecent() {
    recentLoading.value = true
    try {
      recentData.value = await $fetch<ApiFileEntry[]>('/api/storage/recent', {
        headers: ssrHeaders()
      })
    } finally {
      recentLoading.value = false
    }
  }

  async function refreshTagFiles() {
    if (!currentTagId.value) return
    tagFilesData.value = await $fetch<ApiFileEntry[]>(`/api/storage/tags/${currentTagId.value}/files`, {
      headers: ssrHeaders()
    })
  }

  async function refreshTrash() {
    trashLoading.value = true
    try {
      trashData.value = await $fetch<ApiFileEntry[]>('/api/storage/trash', {
        headers: ssrHeaders()
      })
    } finally {
      trashLoading.value = false
    }
  }

  async function refreshSharedByMe() {
    sharedByMeLoading.value = true
    try {
      const raw = await $fetch<{
        objectId: string
        objectType: string
        name: string
        ext: string | null
        starred: boolean
        sizeBytes: number
        blobKey: string | null
        mimeType: string | null
        modifiedAt: string
        createdAt: string
        sharedWith: { email: string | null, role: string, pending: boolean }[]
      }[]>('/api/storage/shared-by-me', {
        headers: ssrHeaders()
      })

      sharedByMeData.value = raw.map(item => ({
        id: item.objectId,
        parentId: null,
        spaceId: '',
        name: item.name,
        type: (item.objectType === 'folder' ? 'folder' : 'file') as 'folder' | 'file',
        mimeType: item.mimeType,
        ext: item.ext,
        sizeBytes: item.sizeBytes,
        blobKey: item.blobKey,
        ownerId: '',
        starred: item.starred,
        trashedAt: null,
        createdAt: item.createdAt,
        modifiedAt: item.modifiedAt,
        _sharedWith: item.sharedWith
      }))
    } finally {
      sharedByMeLoading.value = false
    }
  }

  async function refreshSharedWithMe() {
    sharedWithMeLoading.value = true
    try {
      sharedWithMeData.value = await $fetch<ApiFileEntry[]>('/api/storage/shared', {
        headers: ssrHeaders()
      })
    } finally {
      sharedWithMeLoading.value = false
    }
  }

  const items = computed<ApiFileEntry[]>(() => {
    let entries: ApiFileEntry[] = []

    if (currentTagId.value) {
      entries = tagFilesData.value ?? []
    } else if (special.value === 'starred') {
      entries = starredData.value ?? []
    } else if (special.value === 'recents' || special.value === 'home') {
      entries = recentData.value ?? []
    } else if (special.value === 'shared') {
      entries = sharedWithMeData.value ?? []
    } else if (special.value === 'shared-by-me') {
      entries = sharedByMeData.value ?? []
    } else if (special.value === 'trash') {
      entries = trashData.value ?? []
    } else {
      entries = filesData.value ?? []
    }

    // Merge optimistic entries (shown instantly before server confirms)
    const merged = [...entries, ...optimisticEntries.value]
    return sortEntries(merged)
  })

  const loading = computed(() => {
    // Only show loading skeleton when we have no data yet.
    // This prevents the skeleton from flashing during background
    // refreshes and SSR-to-client hydration.
    if (special.value === 'starred') return starredLoading.value && starredData.value.length === 0
    if (special.value === 'recents' || special.value === 'home') return recentLoading.value && recentData.value.length === 0
    if (special.value === 'trash') return trashLoading.value && trashData.value.length === 0
    if (special.value === 'shared') return sharedWithMeLoading.value && sharedWithMeData.value.length === 0
    if (special.value === 'shared-by-me') return sharedByMeLoading.value && sharedByMeData.value.length === 0
    return filesLoading.value && filesData.value.length === 0
  })

  const starredCount = computed(() => starredData.value?.length ?? 0)

  function sortEntries(arr: ApiFileEntry[] | null | undefined): ApiFileEntry[] {
    if (!arr) return []
    return [...arr].sort((a, b) => {
      const af = a.type === 'folder' ? 0 : 1
      const bf = b.type === 'folder' ? 0 : 1
      if (af !== bf) return af - bf
      return a.name.localeCompare(b.name)
    })
  }

  async function syncFromRoute(
    routeSpecial: SpecialView,
    spaceId: string | null,
    folderPath: string[],
    tagId: string | null = null
  ) {
    // Always keep starred count fresh regardless of current view
    refreshStarred()

    if (tagId) {
      special.value = null
      currentSpaceId.value = null
      currentParentId.value = null
      currentFolderPath.value = []
      currentTagId.value = tagId
      breadcrumb.value = []
      selectedId.value = null
      await refreshTagFiles()
    } else if (routeSpecial) {
      special.value = routeSpecial
      currentSpaceId.value = null
      currentParentId.value = null
      currentFolderPath.value = []
      currentTagId.value = null
      breadcrumb.value = []
      selectedId.value = null

      if (routeSpecial === 'starred') {
        await refreshStarred()
      } else if (routeSpecial === 'recents' || routeSpecial === 'home') {
        await refreshRecent()
      } else if (routeSpecial === 'trash') {
        await refreshTrash()
      } else if (routeSpecial === 'shared') {
        await refreshSharedWithMe()
      } else if (routeSpecial === 'shared-by-me') {
        await refreshSharedByMe()
      }
    } else if (spaceId) {
      special.value = null
      currentSpaceId.value = spaceId
      currentTagId.value = null
      currentFolderPath.value = folderPath
      selectedId.value = null

      // Resolve the name-based path to a parentId + breadcrumb trail
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}
      const resolved = await $fetch<ResolveResult>('/api/storage/resolve', {
        headers,
        query: {
          spaceId,
          path: folderPath.length > 0 ? folderPath.join(',') : undefined
        }
      })
      currentParentId.value = resolved.parentId
      breadcrumb.value = resolved.trail
      refreshFiles()
    }
  }

  function navigateToSpace(spaceId: string) {
    navigateTo(`/spaces/${spaceId}`)
  }

  // Navigate to a folder by building a name-based URL
  function navigateToFolder(spaceId: string, folderNames: string[]) {
    const segments = folderNames.map(n => encodeURIComponent(n))
    navigateTo(`/spaces/${spaceId}/${segments.join('/')}`)
  }

  function setSpecial(view: SpecialView) {
    navigateTo(`/${view}`)
  }

  function selectItem(entry: ApiFileEntry) {
    selectedId.value = entry.id
  }

  function openItem(entry: ApiFileEntry) {
    if (entry.type === 'folder') {
      // Append this folder's name to the current path
      const newPath = [...currentFolderPath.value, entry.name]
      navigateToFolder(entry.spaceId, newPath)
    } else {
      selectedId.value = entry.id
      previewPinned.value = true
    }
  }

  // Resolve a space for uploads — current space, or fall back to the first available
  function resolveUploadSpace(): string | null {
    if (currentSpaceId.value) return currentSpaceId.value
    if (spaces.value?.length > 0) return spaces.value[0]!.id
    return null
  }

  function findQueueItem(id: string): UploadItem | undefined {
    return uploadQueue.value.find(u => u.id === id)
  }

  function uploadFileWithProgress(file: File, spaceId: string, parentId: string | null, itemId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('spaceId', spaceId)
      if (parentId) {
        formData.append('parentId', parentId)
      }

      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/storage/upload')

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const item = findQueueItem(itemId)
          if (item) item.progress = Math.round((e.loaded / e.total) * 100)
        }
      })

      xhr.addEventListener('load', () => {
        const item = findQueueItem(itemId)
        if (xhr.status >= 200 && xhr.status < 300) {
          if (item) {
            item.progress = 100
            item.status = 'done'
          }
          resolve()
        } else {
          if (item) {
            item.status = 'error'
            item.error = `Upload failed (${xhr.status})`
          }
          reject(new Error(`Upload failed (${xhr.status})`))
        }
      })

      xhr.addEventListener('error', () => {
        const item = findQueueItem(itemId)
        if (item) {
          item.status = 'error'
          item.error = 'Network error'
        }
        reject(new Error('Network error'))
      })

      const item = findQueueItem(itemId)
      if (item) item.status = 'uploading'
      xhr.send(formData)
    })
  }

  async function uploadFiles(files: FileList | File[]) {
    const spaceId = resolveUploadSpace()
    if (!spaceId) return

    const parentId = currentSpaceId.value ? currentParentId.value : null

    const pending: ApiFileEntry[] = []
    const queueItems: UploadItem[] = []
    const fileArray = Array.from(files)

    for (const file of fileArray) {
      const tempId = `optimistic-${crypto.randomUUID()}`
      const name = file.name.includes('.')
        ? file.name.replace(/\.[^.]+$/, '')
        : file.name
      const ext = file.name.includes('.')
        ? `.${file.name.split('.').pop()}`
        : null

      pending.push({
        id: tempId,
        parentId,
        spaceId,
        name,
        type: 'file',
        mimeType: file.type || 'application/octet-stream',
        ext,
        sizeBytes: file.size,
        blobKey: null,
        ownerId: '',
        starred: false,
        trashedAt: null,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      })

      queueItems.push({
        id: tempId,
        fileName: file.name,
        fileSize: file.size,
        progress: 0,
        status: 'pending'
      })
    }

    optimisticEntries.value = [...optimisticEntries.value, ...pending]
    uploadQueue.value = [...uploadQueue.value, ...queueItems]

    const uploads = fileArray.map((file, i) =>
      uploadFileWithProgress(file, spaceId, parentId, queueItems[i]!.id).catch(() => {
        // Errors tracked per-item
      })
    )
    await Promise.all(uploads)

    if (special.value === 'recents' || special.value === 'home') {
      await refreshRecent()
    } else if (special.value === 'starred') {
      await refreshStarred()
    } else {
      await refreshFiles()
    }

    optimisticEntries.value = optimisticEntries.value.filter(
      e => !pending.some(p => p.id === e.id)
    )
  }

  async function refreshActiveView() {
    if (currentTagId.value) {
      await refreshTagFiles()
    } else if (special.value === 'recents' || special.value === 'home') {
      await refreshRecent()
    } else if (special.value === 'starred') {
      await refreshStarred()
    } else if (special.value === 'trash') {
      await refreshTrash()
    } else if (special.value === 'shared') {
      await refreshSharedWithMe()
    } else if (special.value === 'shared-by-me') {
      await refreshSharedByMe()
    } else {
      await refreshFiles()
    }
  }

  function dismissUploadQueue() {
    uploadQueue.value = uploadQueue.value.filter(u => u.status === 'pending' || u.status === 'uploading')
  }

  async function createSpace(name: string, color: string) {
    const space = await $fetch<ApiSpace>('/api/storage/spaces', {
      method: 'POST',
      body: { name, color }
    })
    await refreshSpaces()
    const { complete } = useOnboarding()
    complete('createSpace')
    return space
  }

  async function deleteSpace(id: string) {
    await $fetch(`/api/storage/spaces/${id}`, { method: 'DELETE' })
    await refreshSpaces()
    if (currentSpaceId.value === id) {
      currentSpaceId.value = null
      special.value = 'home'
      navigateTo('/home')
    }
  }

  async function createFolder(name: string, parentId?: string | null) {
    if (!currentSpaceId.value) return
    await $fetch('/api/storage/folders', {
      method: 'POST',
      body: {
        name,
        spaceId: currentSpaceId.value,
        parentId: parentId ?? currentParentId.value
      }
    })
    await refreshFiles()
  }

  async function toggleStar(fileId: string, starred: boolean) {
    // Optimistically update all data sources
    for (const list of [filesData, starredData, recentData, tagFilesData, sharedByMeData, trashData]) {
      const idx = list.value?.findIndex(e => e.id === fileId) ?? -1
      if (idx >= 0) {
        list.value[idx] = { ...list.value[idx], starred }
      }
    }

    await $fetch(`/api/storage/files/${fileId}/star`, {
      method: 'PATCH',
      body: { starred }
    })
    await refreshStarred()
    if (starred) {
      const { complete } = useOnboarding()
      complete('starFile')
    }
  }

  async function renameFile(fileId: string, name: string) {
    // Optimistically update the name in whichever data source is active
    for (const list of [filesData, starredData, recentData, tagFilesData, sharedByMeData, trashData]) {
      const idx = list.value?.findIndex(e => e.id === fileId) ?? -1
      if (idx >= 0) {
        list.value[idx] = { ...list.value[idx], name }
      }
    }

    await $fetch(`/api/storage/files/${fileId}/rename`, {
      method: 'PATCH',
      body: { name }
    })

    // Refresh the active data source so the server state is canonical
    if (currentTagId.value) {
      await refreshTagFiles()
    } else if (special.value === 'starred') {
      await refreshStarred()
    } else if (special.value === 'recents' || special.value === 'home') {
      await refreshRecent()
    } else {
      await refreshFiles()
    }
  }

  function removeFromFiles(fileId: string) {
    filesData.value = filesData.value.filter(e => e.id !== fileId)
  }

  async function deleteFile(fileId: string) {
    // Optimistically remove from all data sources
    for (const list of [filesData, starredData, recentData, tagFilesData, sharedByMeData, trashData]) {
      if (list.value) {
        list.value = list.value.filter(e => e.id !== fileId)
      }
    }
    if (selectedId.value === fileId) {
      selectedId.value = null
    }

    await $fetch(`/api/storage/files/${fileId}`, { method: 'DELETE' })
  }

  async function moveFile(fileId: string, newParentId: string | null) {
    await $fetch(`/api/storage/files/${fileId}/move`, {
      method: 'PATCH',
      body: { parentId: newParentId }
    })
    await refreshActiveView()
  }

  async function moveFiles(ids: string[], newParentId: string | null, spaceId?: string) {
    // Optimistically remove from current view
    const idSet = new Set(ids)
    for (const list of [filesData, starredData, recentData, tagFilesData, sharedByMeData, trashData]) {
      if (list.value) {
        list.value = list.value.filter(e => !idSet.has(e.id))
      }
    }
    clearSelection()

    await Promise.all(
      ids.map(id =>
        $fetch(`/api/storage/files/${id}/move`, {
          method: 'PATCH',
          body: { parentId: newParentId, spaceId }
        })
      )
    )
    await refreshActiveView()
  }

  function downloadFiles(ids: string[]) {
    const entries = items.value.filter(f => ids.includes(f.id) && f.blobKey)
    for (const entry of entries) {
      const url = `/api/storage/download?key=${encodeURIComponent(entry.blobKey!)}`
      const a = document.createElement('a')
      a.href = url
      a.download = `${entry.name}${entry.ext || ''}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  async function createTag(label: string, color: string) {
    const tag = await $fetch<ApiTag>('/api/storage/tags', {
      method: 'POST',
      body: { label, color }
    })
    await refreshTags()
    return tag
  }

  async function deleteTag(id: string) {
    await $fetch(`/api/storage/tags/${id}`, { method: 'DELETE' })
    await refreshTags()
  }

  async function tagFile(fileId: string, tagId: string) {
    await $fetch(`/api/storage/files/${fileId}/tags`, {
      method: 'POST',
      body: { tagId }
    })
  }

  async function untagFile(fileId: string, tagId: string) {
    await $fetch(`/api/storage/files/${fileId}/tags/${tagId}`, {
      method: 'DELETE'
    })
  }

  async function getFileTags(fileId: string): Promise<ApiTag[]> {
    return $fetch<ApiTag[]>(`/api/storage/files/${fileId}/tags`)
  }

  const multiSelectActive = computed(() => selectedIds.value.size > 0)

  function toggleSelect(id: string) {
    const next = new Set(selectedIds.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    selectedIds.value = next
    lastClickedId.value = id
  }

  function selectRange(id: string) {
    const list = items.value
    const lastIdx = lastClickedId.value
      ? list.findIndex(f => f.id === lastClickedId.value)
      : -1
    const currentIdx = list.findIndex(f => f.id === id)
    if (lastIdx === -1 || currentIdx === -1) {
      toggleSelect(id)
      return
    }
    const start = Math.min(lastIdx, currentIdx)
    const end = Math.max(lastIdx, currentIdx)
    const next = new Set(selectedIds.value)
    for (let i = start; i <= end; i++) {
      next.add(list[i]!.id)
    }
    selectedIds.value = next
  }

  function selectAll() {
    selectedIds.value = new Set(items.value.map(f => f.id))
  }

  function clearSelection() {
    selectedIds.value = new Set()
    lastClickedId.value = null
  }

  async function deleteFiles(ids: string[]) {
    // Optimistically remove from all data sources
    const idSet = new Set(ids)
    for (const list of [filesData, starredData, recentData, tagFilesData, sharedByMeData, trashData]) {
      if (list.value) {
        list.value = list.value.filter(e => !idSet.has(e.id))
      }
    }
    if (selectedId.value && idSet.has(selectedId.value)) {
      selectedId.value = null
    }
    clearSelection()

    await Promise.all(
      ids.map(id => $fetch(`/api/storage/files/${id}`, { method: 'DELETE' }))
    )
  }

  return {
    spaces,
    tags,
    special,
    viewMode,
    selectedId,
    selectedIds,
    multiSelectActive,
    items,
    previewPinned,
    sidebarOpen,
    sidebarCollapsed,
    starredCount,
    loading,
    uploading,
    uploadQueue,
    dismissUploadQueue,
    currentSpaceId,
    currentParentId,
    currentTagId,
    currentFolderPath,
    breadcrumb,
    navigateToSpace,
    navigateToFolder,
    setSpecial,
    selectItem,
    openItem,
    uploadFiles,
    createSpace,
    deleteSpace,
    createFolder,
    toggleStar,
    renameFile,
    deleteFile,
    moveFile,
    removeFromFiles,
    createTag,
    deleteTag,
    tagFile,
    untagFile,
    getFileTags,
    syncFromRoute,
    refreshSpaces,
    refreshFiles,
    refreshTags,
    toggleSelect,
    selectRange,
    selectAll,
    clearSelection,
    deleteFiles,
    moveFiles,
    downloadFiles
  }
}
