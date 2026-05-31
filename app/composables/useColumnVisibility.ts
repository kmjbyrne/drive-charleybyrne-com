import type { Ref } from 'vue'

interface ListColumn {
  key: string
  label: string
  width: number
  minContainerWidth: number
}

const ALL_LIST_COLUMNS: ListColumn[] = [
  { key: 'members', label: 'Members', width: 130, minContainerWidth: 700 },
  { key: 'modified', label: 'Modified', width: 150, minContainerWidth: 500 },
  { key: 'size', label: 'Size', width: 110, minContainerWidth: 600 }
]

export function useColumnVisibility(panelRef: Ref<HTMLElement | null>) {
  const panelWidth = ref(1200)

  const columnOverrides = ref<Record<string, boolean | null>>({
    members: null,
    modified: null,
    size: null
  })

  const visibleColumnKeys = computed(() =>
    ALL_LIST_COLUMNS.filter((col) => {
      const override = columnOverrides.value[col.key]
      if (override !== null && override !== undefined) return override
      return panelWidth.value >= col.minContainerWidth
    }).map(c => c.key)
  )

  const listGridStyle = computed(() => {
    const extras = ALL_LIST_COLUMNS.filter(c =>
      visibleColumnKeys.value.includes(c.key)
    ).map(c => `${c.width}px`)
    const cols = ['minmax(180px,1fr)', ...extras, '40px'].join(' ')
    return { gridTemplateColumns: cols }
  })

  const navbarCompact = computed(() => panelWidth.value < 700)
  const hideButtonLabels = computed(() => panelWidth.value < 550)

  function buildToggleItems(
    viewModes: { id: string, icon: string, label: string }[],
    viewMode: Ref<string>,
    previewPinned: Ref<boolean>
  ) {
    return computed(() => [
      viewModes.map(mode => ({
        label: mode.label,
        icon: mode.icon,
        onSelect: () => {
          viewMode.value = mode.id
        }
      })),
      ALL_LIST_COLUMNS.map((col) => {
        const visible = visibleColumnKeys.value.includes(col.key)
        return {
          label: col.label,
          icon: visible ? 'i-lucide-check' : 'i-lucide-square',
          onSelect: () => {
            const current = columnOverrides.value[col.key]
            if (current === null || current === undefined) {
              columnOverrides.value[col.key] = !visible
            } else {
              columnOverrides.value[col.key] = !current
            }
          }
        }
      }),
      [
        {
          label: previewPinned.value ? 'Hide preview' : 'Show preview',
          icon: previewPinned.value
            ? 'i-lucide-panel-right-close'
            : 'i-lucide-panel-right-open',
          onSelect: () => {
            previewPinned.value = !previewPinned.value
          }
        }
      ]
    ])
  }

  if (import.meta.client) {
    let resizeObserver: ResizeObserver | null = null
    onMounted(() => {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          panelWidth.value = entry.contentRect.width
        }
      })
      if (panelRef.value) {
        resizeObserver.observe(panelRef.value)
      }
    })
    watch(panelRef, (el) => {
      if (el && resizeObserver) resizeObserver.observe(el)
    })
    onUnmounted(() => {
      resizeObserver?.disconnect()
    })
  }

  return {
    panelWidth,
    visibleColumnKeys,
    listGridStyle,
    navbarCompact,
    hideButtonLabels,
    buildToggleItems
  }
}
