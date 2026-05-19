<script setup lang="ts">
import { FILE_TYPES } from '~/data/file-types'
import type { FileType } from '~/data/types'

const props = defineProps<{
  type: FileType
  size?: 'sm' | 'md' | 'lg'
}>()

const config = computed(() => FILE_TYPES[props.type] || FILE_TYPES.doc)

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'size-6'
    case 'lg': return 'size-10'
    default: return 'size-7'
  }
})

const iconSize = computed(() => {
  switch (props.size) {
    case 'sm': return 'size-3'
    case 'lg': return 'size-5'
    default: return 'size-4'
  }
})
</script>

<template>
  <div
    :class="[sizeClasses, config.bg, 'rounded-md flex items-center justify-center shrink-0']"
  >
    <UIcon
      :name="config.icon"
      :class="[iconSize, config.fg]"
    />
  </div>
</template>
