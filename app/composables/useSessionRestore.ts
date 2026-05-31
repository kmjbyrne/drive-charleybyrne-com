const STORAGE_KEY = 'storage:session'

export interface SessionState {
  route: string
  viewMode: string
  selectedId: string | null
  previewPinned: boolean
  sidebarCollapsed: boolean
}

const defaults: SessionState = {
  route: '/home',
  viewMode: 'list',
  selectedId: null,
  previewPinned: true,
  sidebarCollapsed: false
}

export function useSessionRestore() {
  function save(state: Partial<SessionState>) {
    if (!import.meta.client) return
    const current = load()
    const merged = { ...current, ...state }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  }

  function load(): SessionState {
    if (!import.meta.client) return { ...defaults }
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return { ...defaults }
      const parsed = JSON.parse(raw)
      return { ...defaults, ...parsed }
    } catch {
      return { ...defaults }
    }
  }

  return { save, load }
}
