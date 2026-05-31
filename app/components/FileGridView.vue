<script setup lang="ts">
import type { ApiFileEntry } from '~/composables/useStorage'

defineProps<{
  items: ApiFileEntry[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  (e: 'select' | 'open', file: ApiFileEntry): void
}>()
</script>

<template>
  <div class="flex-1 overflow-auto px-5 pt-2">
    <div class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5">
      <div
        v-for="file in items"
        :key="file.id"
        :class="[
          'rounded-xl border cursor-pointer transition-all p-3 flex flex-col gap-2.5',
          selectedId === file.id
            ? 'border-primary ring-1 ring-primary'
            : 'border-default hover:border-muted'
        ]"
        @click="emit('select', file)"
        @dblclick="emit('open', file)"
      >
        <div class="h-24 rounded-lg bg-elevated flex items-center justify-center">
          <FileIcon
            :type="deriveFileType(file.ext, file.type)"
            :ext="file.ext"
            size="lg"
          />
        </div>
        <div>
          <div class="text-xs font-semibold text-default truncate">
            {{ file.name
            }}<span
              v-if="file.ext && file.ext !== '.md' && file.ext !== '.mdx'"
              class="text-dimmed font-normal"
            >{{ file.ext }}</span>
          </div>
          <div class="text-[11px] text-muted mt-0.5 flex items-center gap-1.5">
            <span>{{ file.modifiedAt }}</span>
            <UIcon
              v-if="file.starred"
              name="i-lucide-star"
              class="size-2.5 text-yellow-500"
            />
          </div>
        </div>
      </div>
    </div>

    <UEmpty
      v-if="items.length === 0"
      icon="i-lucide-trash-2"
      title="Nothing here"
      description="Trash is empty."
      class="py-20"
    />
  </div>
</template>
