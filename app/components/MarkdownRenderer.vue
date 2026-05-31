<script setup lang="ts">
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps<{
  value: string
}>()

const html = computed(() => {
  if (!props.value) return ''
  const raw = marked.parse(props.value, { async: false }) as string
  return DOMPurify.sanitize(raw)
})
</script>

<template>
  <div v-html="html" />
</template>
