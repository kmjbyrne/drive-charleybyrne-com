<script setup lang="ts">
const props = defineProps<{
  src: string
  fileName?: string
  compact?: boolean
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const audioRef = ref<HTMLAudioElement | null>(null)

const loading = ref(true)
const playing = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const waveformData = ref<number[]>([])
const hoverX = ref<number | null>(null)
const hoverY = ref<number | null>(null)
const dragging = ref(false)
const circleMode = ref(false)

const BAR_COUNT = 200
const BAR_WIDTH = 2
const BAR_GAP = 1

async function decodeWaveform(url: string) {
  loading.value = true
  try {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const audioCtx = new AudioContext()
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    audioCtx.close()

    // Set duration from decoded buffer (more reliable than loadedmetadata)
    if (!duration.value) {
      duration.value = audioBuffer.duration
    }

    // Use the first channel
    const rawData = audioBuffer.getChannelData(0)
    const blockSize = Math.floor(rawData.length / BAR_COUNT)
    const bars: number[] = []

    for (let i = 0; i < BAR_COUNT; i++) {
      let sum = 0
      const start = i * blockSize
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[start + j]!)
      }
      bars.push(sum / blockSize)
    }

    // Normalise to 0-1
    const max = Math.max(...bars, 0.01)
    waveformData.value = bars.map(v => v / max)
  } catch (e) {
    console.error('Failed to decode audio waveform:', e)
    waveformData.value = Array(BAR_COUNT).fill(0.3)
  } finally {
    loading.value = false
  }
}

function getColors(canvas: HTMLCanvasElement) {
  const style = getComputedStyle(canvas)
  return {
    primary: style.getPropertyValue('--ui-primary').trim() || '#22c55e',
    dim: style.getPropertyValue('--ui-text-dimmed').trim() || 'rgba(255,255,255,0.2)',
    muted: style.getPropertyValue('--ui-text-muted').trim() || 'rgba(255,255,255,0.4)',
    bg: style.getPropertyValue('--ui-bg').trim() || '#0f172a'
  }
}

function drawLinear() {
  const canvas = canvasRef.value
  if (!canvas || waveformData.value.length === 0) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  const w = rect.width
  const h = rect.height
  ctx.clearRect(0, 0, w, h)

  const bars = waveformData.value
  const barCount = bars.length
  // Fit bars to available width with a small margin
  const margin = 4
  const usableWidth = w - margin * 2
  const barStep = usableWidth / barCount
  const barW = Math.max(1, barStep - BAR_GAP)
  const offsetX = margin

  const progress = duration.value > 0 ? currentTime.value / duration.value : 0
  const progressX = offsetX + progress * usableWidth

  const hoverProgress = hoverX.value !== null
    ? Math.max(0, Math.min(1, (hoverX.value - offsetX) / usableWidth))
    : null

  const colors = getColors(canvas)

  for (let i = 0; i < barCount; i++) {
    const amplitude = bars[i]!
    const barH = Math.max(2, amplitude * (h * 0.8))
    const x = offsetX + i * barStep
    const y = (h - barH) / 2

    const barProgress = (i + 0.5) / barCount
    const isPlayed = barProgress <= progress

    if (isPlayed) {
      ctx.fillStyle = colors.primary
      ctx.globalAlpha = 0.9
    } else if (hoverProgress !== null && barProgress <= hoverProgress) {
      ctx.fillStyle = colors.primary
      ctx.globalAlpha = 0.4
    } else {
      ctx.fillStyle = colors.dim
      ctx.globalAlpha = 0.5
    }

    ctx.beginPath()
    ctx.roundRect(x, y, barW, barH, 1)
    ctx.fill()
  }

  ctx.globalAlpha = 1

  if (duration.value > 0) {
    ctx.strokeStyle = colors.primary
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(progressX, 4)
    ctx.lineTo(progressX, h - 4)
    ctx.stroke()
  }
}

function drawCircular() {
  const canvas = canvasRef.value
  if (!canvas || waveformData.value.length === 0) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  const w = rect.width
  const h = rect.height
  ctx.clearRect(0, 0, w, h)

  const cx = w / 2
  const cy = h / 2
  const maxRadius = Math.min(cx, cy) - 4
  const innerRadius = maxRadius * 0.38
  const barMaxLen = maxRadius - innerRadius

  const bars = waveformData.value
  const barCount = bars.length
  const progress = duration.value > 0 ? currentTime.value / duration.value : 0

  // Hover angle
  let hoverAngleProgress: number | null = null
  if (hoverX.value !== null && hoverY.value !== null) {
    const dx = hoverX.value - cx
    const dy = hoverY.value - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist >= innerRadius * 0.5 && dist <= maxRadius + 10) {
      // Start from top (-PI/2), go clockwise
      let angle = Math.atan2(dy, dx) + Math.PI / 2
      if (angle < 0) angle += Math.PI * 2
      hoverAngleProgress = angle / (Math.PI * 2)
    }
  }

  const colors = getColors(canvas)

  const angleStep = (Math.PI * 2) / barCount
  // Thin gap between bars in radians
  const gapAngle = 0.004

  for (let i = 0; i < barCount; i++) {
    const amplitude = bars[i]!
    const barLen = Math.max(1.5, amplitude * barMaxLen)

    // Start from top (12 o'clock), go clockwise
    const startAngle = i * angleStep - Math.PI / 2
    const endAngle = startAngle + angleStep - gapAngle

    const barProgress = (i + 0.5) / barCount
    const isPlayed = barProgress <= progress

    if (isPlayed) {
      ctx.fillStyle = colors.primary
      ctx.globalAlpha = 0.9
    } else if (hoverAngleProgress !== null && barProgress <= hoverAngleProgress) {
      ctx.fillStyle = colors.primary
      ctx.globalAlpha = 0.4
    } else {
      ctx.fillStyle = colors.dim
      ctx.globalAlpha = 0.5
    }

    ctx.beginPath()
    ctx.arc(cx, cy, innerRadius, startAngle, endAngle)
    ctx.arc(cx, cy, innerRadius + barLen, endAngle, startAngle, true)
    ctx.closePath()
    ctx.fill()
  }

  ctx.globalAlpha = 1

  // Progress arc (thin line at outer edge)
  if (duration.value > 0 && progress > 0) {
    const progressAngle = progress * Math.PI * 2 - Math.PI / 2
    ctx.strokeStyle = colors.primary
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, maxRadius + 2, -Math.PI / 2, progressAngle)
    ctx.stroke()
  }

  // Center circle with play/pause icon area
  ctx.fillStyle = colors.bg
  ctx.globalAlpha = 0.6
  ctx.beginPath()
  ctx.arc(cx, cy, innerRadius - 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  // Time text in center
  ctx.fillStyle = colors.primary
  ctx.font = '600 11px ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(formatTime(currentTime.value), cx, cy - 6)

  ctx.fillStyle = colors.muted
  ctx.font = '10px ui-monospace, monospace'
  ctx.fillText(formatTime(duration.value), cx, cy + 8)
}

function drawWaveform() {
  if (circleMode.value) {
    drawCircular()
  } else {
    drawLinear()
  }
}

function togglePlayback() {
  const audio = audioRef.value
  if (!audio) return
  if (audio.paused) {
    audio.play()
  } else {
    audio.pause()
  }
}

function seekLinear(e: MouseEvent) {
  const canvas = canvasRef.value
  const audio = audioRef.value
  if (!canvas || !audio || !duration.value) return

  const rect = canvas.getBoundingClientRect()
  const margin = 4
  const usableWidth = rect.width - margin * 2
  const x = e.clientX - rect.left
  const progress = Math.max(0, Math.min(1, (x - margin) / usableWidth))
  audio.currentTime = progress * duration.value
}

function seekCircular(e: MouseEvent) {
  const canvas = canvasRef.value
  const audio = audioRef.value
  if (!canvas || !audio || !duration.value) return

  const rect = canvas.getBoundingClientRect()
  const cx = rect.width / 2
  const cy = rect.height / 2
  const dx = (e.clientX - rect.left) - cx
  const dy = (e.clientY - rect.top) - cy

  // Start from top (-PI/2), go clockwise
  let angle = Math.atan2(dy, dx) + Math.PI / 2
  if (angle < 0) angle += Math.PI * 2
  const progress = angle / (Math.PI * 2)
  audio.currentTime = progress * duration.value
}

function seekFromEvent(e: MouseEvent) {
  if (circleMode.value) {
    seekCircular(e)
  } else {
    seekLinear(e)
  }
}

function onCanvasMouseDown(e: MouseEvent) {
  dragging.value = true
  seekFromEvent(e)
}

function onCanvasMouseMove(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  hoverX.value = e.clientX - rect.left
  hoverY.value = e.clientY - rect.top
  if (dragging.value) {
    seekFromEvent(e)
  }
}

function onCanvasMouseLeave() {
  hoverX.value = null
  hoverY.value = null
}

function onGlobalMouseUp() {
  dragging.value = false
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

let animFrame: number | null = null

function tick() {
  const audio = audioRef.value
  if (audio) {
    currentTime.value = audio.currentTime
    playing.value = !audio.paused
  }
  drawWaveform()
  animFrame = requestAnimationFrame(tick)
}

watch(() => props.src, (url) => {
  if (url) decodeWaveform(url)
}, { immediate: true })

onMounted(() => {
  animFrame = requestAnimationFrame(tick)
  document.addEventListener('mouseup', onGlobalMouseUp)
})

onUnmounted(() => {
  if (animFrame) cancelAnimationFrame(animFrame)
  document.removeEventListener('mouseup', onGlobalMouseUp)
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <audio
      ref="audioRef"
      :src="src"
      preload="metadata"
      @loadedmetadata="duration = audioRef!.duration"
      @ended="playing = false"
    />

    <!-- Waveform -->
    <div class="relative">
      <div
        v-if="loading"
        class="flex items-center justify-center"
        :class="circleMode ? 'h-56' : compact ? 'h-16' : 'h-24'"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="size-5 text-muted animate-spin"
        />
      </div>
      <canvas
        v-else
        ref="canvasRef"
        :class="[
          'w-full cursor-pointer rounded-lg',
          circleMode ? 'h-56' : compact ? 'h-16' : 'h-24'
        ]"
        @mousedown.prevent="onCanvasMouseDown"
        @mousemove="onCanvasMouseMove"
        @mouseleave="onCanvasMouseLeave"
      />
    </div>

    <!-- Controls -->
    <div class="flex items-center gap-3">
      <button
        class="size-9 rounded-full bg-primary flex items-center justify-center hover:bg-primary/80 transition-colors shrink-0"
        @click="togglePlayback"
      >
        <UIcon
          :name="playing ? 'i-lucide-pause' : 'i-lucide-play'"
          class="size-4 text-white"
          :class="{ 'ml-0.5': !playing }"
        />
      </button>

      <div class="flex-1 min-w-0">
        <div
          v-if="fileName"
          class="text-sm font-medium text-default truncate"
        >
          {{ fileName }}
        </div>
        <div
          v-if="!circleMode"
          class="text-xs text-muted font-mono tabular-nums"
        >
          {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
        </div>
      </div>

      <UTooltip :text="circleMode ? 'Linear view' : 'Radial view'">
        <UButton
          :icon="circleMode ? 'i-lucide-audio-lines' : 'i-lucide-disc-3'"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="circleMode = !circleMode"
        />
      </UTooltip>
    </div>
  </div>
</template>
