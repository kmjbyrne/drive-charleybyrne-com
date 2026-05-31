<script setup lang="ts">
import { FILE_TYPES, EXT_ICON_MAP } from '~/data/file-types'
import type { FileType } from '~/data/types'

const props = defineProps<{
  type: string
  ext?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
}>()

const iconName = computed(() => {
  if (props.ext) {
    const lower = props.ext.startsWith('.') ? props.ext.toLowerCase() : `.${props.ext.toLowerCase()}`
    if (EXT_ICON_MAP[lower]) return EXT_ICON_MAP[lower]
  }
  const config = FILE_TYPES[props.type as FileType] || FILE_TYPES.file
  return config.icon
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'xs': return 'size-4'
    case 'sm': return 'size-5'
    case 'lg': return 'size-8'
    default: return 'size-6'
  }
})
</script>

<template>
  <UIcon
    :name="iconName"
    :class="[sizeClass, 'shrink-0']"
  />
</template>
