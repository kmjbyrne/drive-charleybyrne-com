<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  description: string
  ctaLabel?: string
  ctaIcon?: string
}>()

const emit = defineEmits<{
  (e: 'action'): void
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
    <div
      v-if="icon"
      class="size-14 rounded-2xl bg-elevated flex items-center justify-center mb-5"
    >
      <UIcon
        :name="icon"
        class="size-7 text-dimmed"
      />
    </div>
    <h2 class="text-lg font-semibold text-default">
      {{ title }}
    </h2>
    <p class="mt-2 text-sm text-muted leading-relaxed">
      {{ description }}
    </p>
    <UButton
      v-if="ctaLabel"
      :label="ctaLabel"
      :icon="ctaIcon"
      class="mt-6"
      @click="emit('action')"
    />
  </div>
</template>
