<script setup lang="ts">
import type { ApiFileEntry } from '~/composables/useStorage'

const props = defineProps<{
  file: ApiFileEntry
  selected?: boolean
  visibleColumns?: string[]
  gridStyle?: Record<string, string>
}>()

const emit = defineEmits<{
  select: [file: ApiFileEntry]
  open: [file: ApiFileEntry]
  manageTags: [file: ApiFileEntry]
  share: [file: ApiFileEntry]
}>()

const { toggleStar, renameFile, deleteFile, createFolder } = useStorage()

const isFolder = computed(() => props.file.type === 'folder')

const renaming = ref(false)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement | null>(null)

function startRename() {
  renameValue.value = props.file.name
  renaming.value = true
  nextTick(() => {
    renameInput.value?.focus()
    renameInput.value?.select()
  })
}

async function commitRename() {
  const trimmed = renameValue.value.trim()
  renaming.value = false
  if (!trimmed || trimmed === props.file.name) return
  await renameFile(props.file.id, trimmed)
}

function cancelRename() {
  renaming.value = false
}

async function handleNewFolder() {
  const name = prompt('New folder name')
  if (!name?.trim()) return
  await createFolder(name.trim(), props.file.id)
}

async function handleToggleStar() {
  await toggleStar(props.file.id, !props.file.starred)
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '---'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return `Today, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: 'long' })
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const isMarkdown = computed(() => {
  const ext = props.file.ext?.toLowerCase()
  return ext === '.md' || ext === '.mdx'
})

const cols = computed(() => props.visibleColumns ?? ['members', 'modified', 'size'])

const sharedWith = computed(() => {
  const sw = (props.file as ApiFileEntry & { _sharedWith?: { email: string | null, firstName: string | null, lastName: string | null, avatar: string | null, role: string, pending: boolean }[] })._sharedWith
  return sw ?? []
})
</script>

<template>
  <div
    :class="[
      'group/row grid items-center px-3 py-2.5 border-b border-default/50 cursor-pointer rounded-md transition-colors',
      selected ? 'bg-primary/5' : 'hover:bg-elevated'
    ]"
    :style="gridStyle"
    @click="emit('select', file)"
    @dblclick="emit('open', file)"
  >
    <!-- Name -->
    <div class="flex items-center gap-3 min-w-0">
      <FileIcon
        :type="deriveFileType(file.ext, file.type)"
        :ext="file.ext"
        size="sm"
      />
      <div class="min-w-0 flex-1">
        <input
          v-if="renaming"
          ref="renameInput"
          v-model="renameValue"
          class="text-sm font-medium text-default bg-transparent border border-primary rounded px-1 py-0.5 w-full outline-none"
          @keydown.enter="commitRename"
          @keydown.escape="cancelRename"
          @blur="commitRename"
          @click.stop
          @dblclick.stop
        >
        <div
          v-else
          class="text-sm font-medium text-default truncate"
        >
          {{ file.name }}<span
            v-if="file.ext && !isMarkdown"
            class="text-dimmed font-normal"
          >{{ file.ext }}</span>
        </div>
      </div>
      <button
        class="shrink-0 p-1.5 mr-4 rounded hover:bg-elevated transition-colors"
        :title="file.starred ? 'Unstar' : 'Star'"
        @click.stop="handleToggleStar"
      >
        <UIcon
          :name="file.starred ? 'i-lucide-star' : 'i-lucide-star'"
          :class="['size-3.5', file.starred ? 'text-yellow-500' : 'text-dimmed opacity-0 group-hover/row:opacity-100']"
        />
      </button>
    </div>

    <!-- Members -->
    <div
      v-if="cols.includes('members')"
      class="flex items-center"
    >
      <div
        v-if="sharedWith.length > 0"
        class="flex -space-x-1.5"
      >
        <UTooltip
          v-for="(member, i) in sharedWith.slice(0, 3)"
          :key="i"
          :text="(member.email || 'Unknown') + (member.pending ? ' (pending)' : '')"
        >
          <UAvatar
            v-if="!member.pending"
            :src="member.avatar || undefined"
            :alt="member.firstName ? `${member.firstName} ${member.lastName}` : member.email || '?'"
            size="3xs"
            class="ring-2 ring-default"
          />
          <div
            v-else
            class="size-5 rounded-full bg-elevated flex items-center justify-center ring-2 ring-default"
          >
            <UIcon
              name="i-lucide-mail"
              class="size-3 text-dimmed"
            />
          </div>
        </UTooltip>
        <span
          v-if="sharedWith.length > 3"
          class="flex items-center justify-center size-5 rounded-full bg-elevated text-[10px] font-medium text-muted ring-2 ring-default"
        >
          +{{ sharedWith.length - 3 }}
        </span>
      </div>
    </div>

    <!-- Modified -->
    <div
      v-if="cols.includes('modified')"
      class="text-xs text-muted"
    >
      {{ formatDate(file.modifiedAt) }}
    </div>

    <!-- Size -->
    <div
      v-if="cols.includes('size')"
      class="text-xs text-muted font-mono"
    >
      {{ formatSize(file.sizeBytes) }}
    </div>

    <!-- Actions -->
    <div class="flex justify-end">
      <UDropdownMenu
        :items="[
          [
            { label: 'Open', icon: 'i-lucide-eye', onSelect: () => emit('open', file) },
            ...(isFolder ? [{ label: 'New folder', icon: 'i-lucide-folder-plus', onSelect: () => handleNewFolder() }] : []),
            { label: file.starred ? 'Unstar' : 'Star', icon: 'i-lucide-star', onSelect: () => handleToggleStar() },
            { label: 'Tags...', icon: 'i-lucide-tags', onSelect: () => emit('manageTags', file) },
            { label: 'Share...', icon: 'i-lucide-share-2', onSelect: () => emit('share', file) },
            { label: 'Rename', icon: 'i-lucide-pencil', onSelect: () => startRename() }
          ],
          [
            { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => deleteFile(file.id) }
          ]
        ]"
        :content="{ align: 'end' as const }"
      >
        <UButton
          icon="i-lucide-ellipsis"
          variant="ghost"
          color="neutral"
          size="xs"
          @click.stop
        />
      </UDropdownMenu>
    </div>
  </div>
</template>
