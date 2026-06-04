<script setup lang="ts">
import type { HintId } from '~/composables/useTooltipTour'

const props = defineProps<{
  hintId: HintId
  title: string
  description: string
  icon?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
}>()

const { isActive, dismiss } = useTooltipTour()

const anchorRef = ref<HTMLElement | null>(null)
const show = ref(false)
const active = computed(() => isActive(props.hintId))

const pos = reactive({ top: '0px', left: '0px' })

function updatePosition() {
  // anchorRef wraps content — measure its first child if available
  const el = anchorRef.value?.firstElementChild as HTMLElement | null
  const target = el ?? anchorRef.value
  if (!target) return

  const rect = target.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return

  const side = props.side ?? 'bottom'
  const gap = 10
  const popW = 240

  switch (side) {
    case 'bottom':
      pos.top = `${rect.bottom + gap}px`
      pos.left = `${Math.max(8, rect.left + rect.width / 2 - popW / 2)}px`
      break
    case 'top':
      pos.top = `${rect.top - gap}px`
      pos.left = `${Math.max(8, rect.left + rect.width / 2 - popW / 2)}px`
      break
    case 'right':
      pos.top = `${rect.top + rect.height / 2}px`
      pos.left = `${rect.right + gap}px`
      break
    case 'left':
      pos.top = `${rect.top + rect.height / 2}px`
      pos.left = `${rect.left - gap - popW}px`
      break
  }
}

const translateY = computed(() => {
  const side = props.side ?? 'bottom'
  if (side === 'top') return '-100%'
  if (side === 'right' || side === 'left') return '-50%'
  return '0'
})

onMounted(() => {
  const timer = setTimeout(() => {
    updatePosition()
    show.value = true
  }, 1000)
  onUnmounted(() => clearTimeout(timer))
})

function handleDismiss() {
  show.value = false
  dismiss(props.hintId)
}
</script>

<template>
  <span
    ref="anchorRef"
    style="display: contents"
  >
    <slot />
  </span>

  <Teleport to="body">
    <Transition
      enter-active-class="hint-enter-active"
      enter-from-class="hint-enter-from"
      enter-to-class="hint-enter-to"
      leave-active-class="hint-leave-active"
      leave-from-class="hint-enter-to"
      leave-to-class="hint-enter-from"
    >
      <div
        v-if="active && show"
        class="hint-wrapper"
        :style="{
          top: pos.top,
          left: pos.left,
          transform: `translateY(${translateY})`
        }"
      >
        <div class="hint-popover">
          <div class="hint-body">
            <div
              v-if="icon"
              class="hint-icon-wrap"
            >
              <UIcon
                :name="icon"
                class="hint-icon"
              />
            </div>
            <div class="hint-content">
              <p class="hint-title">
                {{ title }}
              </p>
              <p class="hint-description">
                {{ description }}
              </p>
            </div>
            <button
              class="hint-close"
              title="Dismiss"
              @click.stop="handleDismiss"
            >
              <UIcon
                name="i-lucide-x"
                class="hint-close-icon"
              />
            </button>
          </div>
          <div class="hint-footer">
            <span class="hint-label">Tip</span>
            <button
              class="hint-action"
              @click.stop="handleDismiss"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.hint-wrapper {
  position: fixed;
  z-index: 9999;
  width: 240px;
  pointer-events: auto;
}

.hint-enter-active {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}

.hint-leave-active {
  transition: opacity 0.15s ease-in, transform 0.15s ease-in;
}

.hint-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.hint-enter-to {
  opacity: 1;
  transform: translateY(0);
}

.hint-popover {
  background: #1e293b;
  color: #f1f5f9;
  border-radius: 0.5rem;
  padding: 0.75rem;
  box-shadow:
    0 10px 25px -5px rgb(0 0 0 / 0.3),
    0 8px 10px -6px rgb(0 0 0 / 0.2);
  border: 1px solid rgb(255 255 255 / 0.08);
}

.hint-body {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
}

.hint-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  color: #f8fafc;
}

.hint-icon-wrap {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  background: rgb(255 255 255 / 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hint-icon {
  width: 0.875rem;
  height: 0.875rem;
  color: #94a3b8;
}

.hint-content {
  flex: 1;
  min-width: 0;
}

.hint-description {
  font-size: 0.75rem;
  margin-top: 0.25rem;
  line-height: 1.5;
  color: #94a3b8;
}

.hint-close {
  flex-shrink: 0;
  padding: 0.125rem;
  border-radius: 0.25rem;
  color: #64748b;
  transition: color 0.15s;
  background: none;
  border: none;
  cursor: pointer;
}

.hint-close:hover {
  color: #cbd5e1;
}

.hint-close-icon {
  width: 0.875rem;
  height: 0.875rem;
}

.hint-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.625rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgb(255 255 255 / 0.08);
}

.hint-label {
  font-size: 11px;
  color: #64748b;
}

.hint-action {
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  transition: color 0.15s;
  background: none;
  border: none;
  cursor: pointer;
}

.hint-action:hover {
  color: #f1f5f9;
}
</style>
