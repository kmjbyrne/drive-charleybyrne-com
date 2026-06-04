<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

interface ActivityItem {
  id: string
  action: string
  objectId: string
  objectType: string
  objectName: string
  actor: {
    id: string
    firstName: string
    lastName: string
    avatar: string | null
  }
  target: {
    id: string
    firstName: string
    lastName: string
    avatar: string | null
  } | null
  createdAt: string
}

const activities = ref<ActivityItem[]>([])
const loading = ref(true)

async function fetchActivity() {
  loading.value = true
  try {
    activities.value = await $fetch<ActivityItem[]>('/api/activity', {
      query: { limit: 50 }
    })
  } catch {
    activities.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchActivity)

const ACTION_META: Record<string, { icon: string; verb: string }> = {
  'file.uploaded': { icon: 'i-lucide-upload', verb: 'uploaded' },
  'file.renamed': { icon: 'i-lucide-pencil', verb: 'renamed' },
  'file.starred': { icon: 'i-lucide-star', verb: 'starred' },
  'file.unstarred': { icon: 'i-lucide-star-off', verb: 'unstarred' },
  'file.trashed': { icon: 'i-lucide-trash-2', verb: 'trashed' },
  'file.restored': { icon: 'i-lucide-rotate-ccw', verb: 'restored' },
  'file.deleted': { icon: 'i-lucide-x', verb: 'deleted' },
  'folder.created': { icon: 'i-lucide-folder-plus', verb: 'created folder' },
  'folder.deleted': { icon: 'i-lucide-folder-x', verb: 'deleted folder' },
  'space.created': { icon: 'i-lucide-layers', verb: 'created space' },
  'space.deleted': { icon: 'i-lucide-layers', verb: 'deleted space' },
  'share.granted': { icon: 'i-lucide-share-2', verb: 'shared' },
  'share.revoked': { icon: 'i-lucide-user-minus', verb: 'revoked access to' },
  'share.invited': { icon: 'i-lucide-mail', verb: 'invited someone to' }
}

function actionIcon(action: string): string {
  return ACTION_META[action]?.icon || 'i-lucide-activity'
}

function describe(item: ActivityItem): string {
  const verb = ACTION_META[item.action]?.verb || item.action
  const actor = `${item.actor.firstName} ${item.actor.lastName}`
  let text = `${actor} ${verb} ${item.objectName}`
  if (item.target) {
    text += ` with ${item.target.firstName} ${item.target.lastName}`
  }
  return text
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <div class="flex items-center gap-2 px-4 py-2">
        <UIcon
          name="i-lucide-activity"
          class="size-5 text-primary"
        />
        <span class="text-sm font-semibold text-default">Activity</span>
      </div>
    </template>

    <template #body>
      <div class="px-5 pt-5 pb-3">
        <h1 class="text-xl font-bold text-default">
          Activity
        </h1>
        <p class="text-sm text-muted mt-1">
          Recent actions across your files and spaces
        </p>
      </div>

      <div
        v-if="loading"
        class="flex justify-center py-12"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="size-5 text-muted animate-spin"
        />
      </div>

      <div
        v-else-if="activities.length === 0"
        class="px-5 py-12 text-center"
      >
        <UIcon
          name="i-lucide-activity"
          class="size-10 text-dimmed mx-auto mb-3"
        />
        <p class="text-sm text-muted">
          No activity yet
        </p>
      </div>

      <div
        v-else
        class="px-5 pb-5"
      >
        <div class="space-y-1">
          <div
            v-for="item in activities"
            :key="item.id"
            class="flex items-start gap-3 py-2.5 border-b border-default last:border-0"
          >
            <UAvatar
              :src="item.actor.avatar || undefined"
              :alt="`${item.actor.firstName} ${item.actor.lastName}`"
              size="sm"
              class="shrink-0 mt-0.5"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm text-default leading-relaxed">
                {{ describe(item) }}
              </p>
              <p class="text-xs text-dimmed mt-0.5">
                {{ timeAgo(item.createdAt) }}
              </p>
            </div>
            <UIcon
              :name="actionIcon(item.action)"
              class="size-4 text-muted shrink-0 mt-1"
            />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
