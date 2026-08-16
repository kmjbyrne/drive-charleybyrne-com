export function useFileDrop(onDrop: (files: File[]) => void, enabled?: Ref<boolean>) {
  const active = ref(false)
  // dragenter/dragleave fire for every element crossed, so track nesting depth
  let depth = 0

  function hasFiles(event: DragEvent) {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files')
  }

  function allowed(event: DragEvent) {
    return hasFiles(event) && (enabled?.value ?? true)
  }

  function onDragEnter(event: DragEvent) {
    if (!allowed(event)) return
    depth++
    active.value = true
  }

  function onDragOver(event: DragEvent) {
    if (!allowed(event)) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    active.value = true
  }

  function onDragLeave(event: DragEvent) {
    if (!allowed(event)) return
    depth = Math.max(0, depth - 1)
    if (depth === 0) active.value = false
  }

  function reset() {
    depth = 0
    active.value = false
  }

  async function onDropEvent(event: DragEvent) {
    if (!hasFiles(event)) return
    event.preventDefault()
    reset()
    if (!(enabled?.value ?? true)) return

    const files = await collectFiles(event.dataTransfer)
    if (files.length) onDrop(files)
  }

  onMounted(() => {
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDropEvent)
    window.addEventListener('blur', reset)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('dragenter', onDragEnter)
    window.removeEventListener('dragover', onDragOver)
    window.removeEventListener('dragleave', onDragLeave)
    window.removeEventListener('drop', onDropEvent)
    window.removeEventListener('blur', reset)
  })

  return { active }
}

// Walks dropped directories so folder drops upload their contents rather than nothing.
async function collectFiles(transfer: DataTransfer | null): Promise<File[]> {
  if (!transfer) return []

  const entries = Array.from(transfer.items ?? [])
    .filter(item => item.kind === 'file')
    .map(item => item.webkitGetAsEntry?.() ?? null)

  if (!entries.some(Boolean)) return Array.from(transfer.files ?? [])

  const files: File[] = []
  for (const entry of entries) {
    if (entry) await walkEntry(entry, files)
  }
  return files
}

async function walkEntry(entry: FileSystemEntry, out: File[]) {
  if (entry.isFile) {
    const file = await new Promise<File | null>(resolve =>
      (entry as FileSystemFileEntry).file(resolve, () => resolve(null))
    )
    if (file) out.push(file)
    return
  }

  if (!entry.isDirectory) return

  const reader = (entry as FileSystemDirectoryEntry).createReader()
  while (true) {
    const batch = await new Promise<FileSystemEntry[]>(resolve =>
      reader.readEntries(resolve, () => resolve([]))
    )
    if (!batch.length) break
    for (const child of batch) await walkEntry(child, out)
  }
}
