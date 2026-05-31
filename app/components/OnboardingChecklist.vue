<script setup lang="ts">
import type { OnboardingStep } from '~/composables/useOnboarding'

const { visible, steps, progress, dismiss } = useOnboarding()
const { onboarding: t } = useContent()

const stepLabels: Record<OnboardingStep, string> = {
  createSpace: t.value.checklist.steps.createSpace,
  uploadFile: t.value.checklist.steps.uploadFile,
  starFile: t.value.checklist.steps.starFile,
  usePreview: t.value.checklist.steps.usePreview
}

const stepIcons: Record<OnboardingStep, string> = {
  createSpace: 'i-lucide-layers',
  uploadFile: 'i-lucide-upload',
  starFile: 'i-lucide-star',
  usePreview: 'i-lucide-panel-right-open'
}
</script>

<template>
  <div
    v-if="visible"
    class="rounded-lg border border-default bg-default p-4 space-y-3"
  >
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-default">
        {{ t.checklist.title }}
      </h3>
      <UButton
        :label="t.checklist.dismiss"
        variant="ghost"
        color="neutral"
        size="xs"
        @click="dismiss"
      />
    </div>

    <UProgress
      :model-value="progress"
      :max="100"
      size="xs"
      color="primary"
    />

    <ul class="space-y-1.5">
      <li
        v-for="step in steps"
        :key="step.id"
        class="flex items-center gap-2.5 text-sm"
        :class="step.done ? 'text-muted line-through' : 'text-default'"
      >
        <UIcon
          :name="step.done ? 'i-lucide-check-circle-2' : stepIcons[step.id]"
          class="size-4 shrink-0"
          :class="step.done ? 'text-green-500' : 'text-dimmed'"
        />
        <span>{{ stepLabels[step.id] }}</span>
      </li>
    </ul>
  </div>
</template>
