export type OnboardingStep = 'createSpace' | 'uploadFile' | 'starFile' | 'usePreview'

const STORAGE_KEY = 'storage-onboarding'

interface OnboardingState {
  dismissed: boolean
  completed: Record<OnboardingStep, boolean>
}

const ALL_STEPS: OnboardingStep[] = ['createSpace', 'uploadFile', 'starFile', 'usePreview']

function defaultState(): OnboardingState {
  return {
    dismissed: false,
    completed: {
      createSpace: false,
      uploadFile: false,
      starFile: false,
      usePreview: false
    }
  }
}

function load(): OnboardingState {
  if (import.meta.server) return defaultState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    return { ...defaultState(), ...JSON.parse(raw) }
  } catch {
    return defaultState()
  }
}

function save(state: OnboardingState) {
  if (import.meta.server) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const state = ref<OnboardingState>(defaultState())

export function useOnboarding() {
  if (import.meta.client && state.value.dismissed === false && !state.value.completed.createSpace) {
    state.value = load()
  }

  const visible = computed(() => !state.value.dismissed)

  const steps = computed(() =>
    ALL_STEPS.map(id => ({
      id,
      done: state.value.completed[id]
    }))
  )

  const allDone = computed(() => ALL_STEPS.every(s => state.value.completed[s]))

  const progress = computed(() => {
    const done = ALL_STEPS.filter(s => state.value.completed[s]).length
    return Math.round((done / ALL_STEPS.length) * 100)
  })

  function complete(step: OnboardingStep) {
    if (state.value.completed[step]) return
    state.value.completed[step] = true
    save(state.value)
  }

  function dismiss() {
    state.value.dismissed = true
    save(state.value)
  }

  function reset() {
    state.value = defaultState()
    save(state.value)
  }

  return { visible, steps, allDone, progress, complete, dismiss, reset }
}
