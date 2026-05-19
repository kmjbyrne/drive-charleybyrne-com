<script setup lang="ts">
import type { FileNode } from '~/data/types'
import { findPerson } from '~/data/people'

const props = defineProps<{
  file: FileNode
  selected?: boolean
}>()

const emit = defineEmits<{
  select: [file: FileNode]
  open: [file: FileNode]
}>()

const members = computed(() => {
  return (props.file.members || [])
    .map(id => findPerson(id))
    .filter(Boolean)
    .slice(0, 3)
})
</script>

<template>
  <div
    :class="[
      'grid grid-cols-[1fr_130px_150px_110px_40px] items-center px-3 py-2.5 border-b border-default/50 cursor-pointer rounded-md transition-colors',
      selected ? 'bg-primary/5' : 'hover:bg-elevated'
    ]"
    @click="emit('select', file)"
    @dblclick="emit('open', file)"
  >
    <!-- Name -->
    <div class="flex items-center gap-3 min-w-0">
      <FileIcon
        :type="file.type"
        size="sm"
      />
      <div class="min-w-0 flex-1">
        <div class="text-sm font-medium text-default truncate">
          {{ file.name }}<span class="text-dimmed font-normal">{{ file.ext || '' }}</span>
        </div>
        <div
          v-if="file.type === 'folder' && file.children"
          class="text-xs text-muted"
        >
          {{ file.children.length }} items
        </div>
      </div>
      <UIcon
        v-if="file.starred"
        name="i-lucide-star"
        class="size-3.5 text-yellow-500"
      />
    </div>

    <!-- Members -->
    <div>
      <UAvatarGroup
        v-if="members.length"
        :max="3"
        size="xs"
      >
        <UAvatar
          v-for="person in members"
          :key="person!.id"
          :alt="person!.name"
          :ui="{ fallback: 'text-[10px] font-semibold' }"
          :style="{ '--tw-ring-color': person!.color }"
        />
      </UAvatarGroup>
    </div>

    <!-- Modified -->
    <div class="text-xs text-muted">
      {{ file.modified }}
    </div>

    <!-- Size -->
    <div class="text-xs text-muted font-mono">
      {{ file.size || '---' }}
    </div>

    <!-- Actions -->
    <div class="flex justify-end">
      <UDropdownMenu
        :items="[
          [
            { label: 'Open', icon: 'i-lucide-eye' },
            { label: 'Share...', icon: 'i-lucide-share-2' },
            { label: 'Copy link', icon: 'i-lucide-link' },
            { label: 'Version history', icon: 'i-lucide-history' },
            { label: 'Rename', icon: 'i-lucide-pencil' },
            { label: 'Move to...', icon: 'i-lucide-folder-input' }
          ],
          [
            { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const }
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
