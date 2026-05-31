<script setup lang="ts">
import type { UploadItem } from '~/composables/useStorage'

const props = defineProps<{
  queue: UploadItem[]
}>()

const emit = defineEmits<{
  (e: 'dismiss'): void
}>()

const collapsed = ref(false)

const doneCount = computed(() => props.queue.filter(u => u.status === 'done').length)
const errorCount = computed(() => props.queue.filter(u => u.status === 'error').length)
const activeCount = computed(() => props.queue.filter(u => u.status === 'pending' || u.status === 'uploading').length)
const totalCount = computed(() => props.queue.length)

const allFinished = computed(() => activeCount.value === 0)

const overallProgress = computed(() => {
  if (totalCount.value === 0) return 0
  const total = props.queue.reduce((sum, u) => sum + u.progress, 0)
  return Math.round(total / totalCount.value)
})

const headerLabel = computed(() => {
  if (allFinished.value) {
    if (errorCount.value > 0) {
      return `${doneCount.value} uploaded, ${errorCount.value} failed`
    }
    return `${doneCount.value} file${doneCount.value === 1 ? '' : 's'} uploaded`
  }
  return `Uploading ${activeCount.value} of ${totalCount.value} file${totalCount.value === 1 ? '' : 's'}`
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function statusIcon(item: UploadItem): string {
  if (item.status === 'done') return 'i-lucide-check-circle'
  if (item.status === 'error') return 'i-lucide-alert-circle'
  return 'i-lucide-loader'
}

function statusColor(item: UploadItem): string {
  if (item.status === 'done') return 'text-green-500'
  if (item.status === 'error') return 'text-red-500'
  return 'text-muted'
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-y-4 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-4 opacity-0"
  >
    <div
      v-if="queue.length > 0"
      class="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-default bg-default shadow-xl overflow-hidden"
    >
      <!-- Header -->
      <div
        class="flex items-center gap-2 px-3 py-2.5 bg-elevated cursor-pointer select-none"
        @click="collapsed = !collapsed"
      >
        <UIcon
          v-if="!allFinished"
          name="i-lucide-loader"
          class="size-4 text-primary animate-spin shrink-0"
        />
        <UIcon
          v-else-if="errorCount > 0"
          name="i-lucide-alert-circle"
          class="size-4 text-red-500 shrink-0"
        />
        <UIcon
          v-else
          name="i-lucide-check-circle"
          class="size-4 text-green-500 shrink-0"
        />

        <span class="text-sm font-medium text-default flex-1 truncate">
          {{ headerLabel }}
        </span>

        <UButton
          :icon="collapsed ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          variant="ghost"
          color="neutral"
          size="xs"
          class="shrink-0"
          @click.stop="collapsed = !collapsed"
        />
        <UButton
          v-if="allFinished"
          icon="i-lucide-x"
          variant="ghost"
          color="neutral"
          size="xs"
          class="shrink-0"
          @click.stop="emit('dismiss')"
        />
      </div>

      <!-- Overall progress bar (shown when not collapsed and still uploading) -->
      <div
        v-if="!allFinished"
        class="h-0.5 bg-muted/20"
      >
        <div
          class="h-full bg-primary transition-all duration-300"
          :style="{ width: `${overallProgress}%` }"
        />
      </div>

      <!-- File list -->
      <div
        v-show="!collapsed"
        class="max-h-64 overflow-y-auto divide-y divide-default"
      >
        <div
          v-for="item in queue"
          :key="item.id"
          class="flex items-center gap-2.5 px-3 py-2"
        >
          <UIcon
            :name="statusIcon(item)"
            :class="['size-4 shrink-0', statusColor(item), item.status === 'uploading' ? 'animate-spin' : '']"
          />

          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2">
              <span class="text-sm text-default truncate">{{ item.fileName }}</span>
              <span class="text-xs text-dimmed shrink-0">{{ formatSize(item.fileSize) }}</span>
            </div>

            <!-- Per-file progress bar -->
            <div
              v-if="item.status === 'uploading' || item.status === 'pending'"
              class="mt-1 h-1 rounded-full bg-muted/20 overflow-hidden"
            >
              <div
                class="h-full bg-primary rounded-full transition-all duration-300"
                :style="{ width: `${item.progress}%` }"
              />
            </div>

            <p
              v-if="item.status === 'error'"
              class="text-xs text-red-500 mt-0.5"
            >
              {{ item.error }}
            </p>
          </div>

          <span
            v-if="item.status === 'uploading'"
            class="text-xs text-muted tabular-nums shrink-0"
          >
            {{ item.progress }}%
          </span>
        </div>
      </div>
    </div>
  </Transition>
</template>
