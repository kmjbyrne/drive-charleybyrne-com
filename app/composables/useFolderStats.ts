const cache = new Map<string, { files: number, folders: number }>()

export function useFolderStats() {
  const visible = ref(false)
  const stats = ref<{ files: number, folders: number } | null>(null)
  const loading = ref(false)
  let hoverTimer: ReturnType<typeof setTimeout> | null = null
  let currentId: string | null = null

  async function fetchStats(folderId: string) {
    const cached = cache.get(folderId)
    if (cached) {
      stats.value = cached
      visible.value = true
      return
    }
    loading.value = true
    visible.value = true
    try {
      const result = await $fetch<{ files: number, folders: number }>(
        `/api/storage/files/${folderId}/stats`
      )
      cache.set(folderId, result)
      stats.value = result
    } catch {
      stats.value = null
      visible.value = false
    } finally {
      loading.value = false
    }
  }

  function onMouseEnter(folderId: string) {
    currentId = folderId
    hoverTimer = setTimeout(() => fetchStats(folderId), 1000)
  }

  function onMouseLeave() {
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      hoverTimer = null
    }
    visible.value = false
    currentId = null
  }

  return {
    visible,
    stats,
    loading,
    onMouseEnter,
    onMouseLeave
  }
}
