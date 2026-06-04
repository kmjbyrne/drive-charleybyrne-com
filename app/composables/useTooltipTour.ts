export type HintId =
  | 'search'
  | 'sidebar-spaces'
  | 'upload-files'
  | 'view-modes'
  | 'preview-panel'

// The order hints appear in — one at a time
const HINT_ORDER: HintId[] = [
  'search',
  'sidebar-spaces',
  'view-modes',
  'upload-files',
  'preview-panel'
]

const STORAGE_KEY = 'storage-tooltip-hints'

interface HintState {
  dismissed: HintId[]
}

function load(): HintState {
  if (import.meta.server) return { dismissed: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { dismissed: [] }
    return JSON.parse(raw)
  } catch {
    return { dismissed: [] }
  }
}

function save(state: HintState) {
  if (import.meta.server) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const state = ref<HintState>({ dismissed: [] })
let loaded = false

export function useTooltipTour() {
  if (import.meta.client && !loaded) {
    state.value = load()
    loaded = true
  }

  // Only one hint is active at a time — the first undismissed one in order
  const activeHint = computed<HintId | null>(() => {
    return HINT_ORDER.find(id => !state.value.dismissed.includes(id)) ?? null
  })

  function isActive(id: HintId): boolean {
    return activeHint.value === id
  }

  function dismiss(id: HintId) {
    if (state.value.dismissed.includes(id)) return
    state.value.dismissed.push(id)
    save(state.value)
  }

  function dismissAll() {
    state.value.dismissed = [...HINT_ORDER]
    save(state.value)
  }

  function reset() {
    state.value = { dismissed: [] }
    loaded = false
    save(state.value)
  }

  return { activeHint, isActive, dismiss, dismissAll, reset }
}
