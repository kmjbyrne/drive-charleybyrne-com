<script setup lang="ts">
import type { ApiFileEntry } from '~/composables/useStorage'

interface Collaborator {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  avatar: string | null
  role: string
  grantedBy: string
  createdAt: string
  pending?: boolean
}

interface SearchUser {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar: string | null
}

const open = ref(false)
const file = ref<ApiFileEntry | null>(null)
const collaborators = ref<Collaborator[]>([])
const loading = ref(false)
const sharing = ref(false)
const emailInput = ref('')
const searchResults = ref<SearchUser[]>([])
const searching = ref(false)
const role = ref<'viewer' | 'editor' | 'admin'>('viewer')
const error = ref('')
const success = ref('')

let searchTimeout: ReturnType<typeof setTimeout> | null = null

async function show(entry: ApiFileEntry) {
  file.value = entry
  open.value = true
  error.value = ''
  success.value = ''
  emailInput.value = ''
  searchResults.value = []
  role.value = 'viewer'
  await loadCollaborators()
}

async function loadCollaborators() {
  if (!file.value) return
  loading.value = true
  try {
    collaborators.value = await $fetch<Collaborator[]>('/api/storage/sharing/collaborators', {
      query: { objectId: file.value.id }
    })
  } catch {
    collaborators.value = []
  } finally {
    loading.value = false
  }
}

function onEmailInput() {
  if (searchTimeout) clearTimeout(searchTimeout)
  success.value = ''
  error.value = ''
  const q = emailInput.value.trim()
  if (q.length < 3) {
    searchResults.value = []
    return
  }
  searching.value = true
  searchTimeout = setTimeout(async () => {
    try {
      searchResults.value = await $fetch<SearchUser[]>('/api/users/search', {
        query: { q }
      })
    } catch {
      searchResults.value = []
    } finally {
      searching.value = false
    }
  }, 300)
}

function selectSuggestion(user: SearchUser) {
  emailInput.value = user.email
  searchResults.value = []
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const canShare = computed(() =>
  isValidEmail(emailInput.value.trim()) && !sharing.value
)

async function handleShare() {
  if (!file.value || !canShare.value) return
  error.value = ''
  success.value = ''
  sharing.value = true
  try {
    const objectType = file.value.type === 'folder' ? 'folder' : 'file'
    const result = await $fetch<{ type: string }>('/api/storage/sharing/grant', {
      method: 'POST',
      body: {
        objectId: file.value.id,
        objectType,
        email: emailInput.value.trim().toLowerCase(),
        role: role.value
      }
    })
    if (result.type === 'invited') {
      success.value = `${emailInput.value.trim()} will get access when they sign in`
    } else {
      success.value = `Shared with ${emailInput.value.trim()}`
    }
    emailInput.value = ''
    searchResults.value = []
    await loadCollaborators()
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message
    error.value = msg || 'Failed to share'
  } finally {
    sharing.value = false
  }
}

async function handleRevoke(collab: Collaborator) {
  if (!file.value) return
  try {
    const body: Record<string, string> = { objectId: file.value.id }
    if (collab.pending) {
      body.email = collab.email!
    } else {
      body.subjectId = collab.id
    }
    await $fetch('/api/storage/sharing/revoke', {
      method: 'POST',
      body
    })
    collaborators.value = collaborators.value.filter(c => c.id !== collab.id)
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message
    error.value = msg || 'Failed to revoke access'
  }
}

const roleOptions = [
  { label: 'Viewer', value: 'viewer' as const },
  { label: 'Editor', value: 'editor' as const },
  { label: 'Admin', value: 'admin' as const }
]

const description = computed(() => {
  if (!file.value) return ''
  return `Share ${file.value.name}${file.value.ext || ''} with others`
})

defineExpose({ show })
</script>

<template>
  <UModal
    v-model:open="open"
    title="Share"
    :description="description"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Share form -->
        <form
          class="space-y-3"
          @submit.prevent="handleShare"
        >
          <div class="relative">
            <UInput
              v-model="emailInput"
              placeholder="Add people by email"
              class="w-full"
              size="sm"
              icon="i-lucide-mail"
              type="email"
              @input="onEmailInput"
              @keydown.escape="searchResults = []"
            />

            <!-- Autocomplete suggestions for known users -->
            <div
              v-if="searchResults.length > 0"
              class="absolute z-10 mt-1 w-full bg-default border border-default rounded-md shadow-lg max-h-48 overflow-y-auto"
            >
              <button
                v-for="user in searchResults"
                :key="user.id"
                type="button"
                class="w-full flex items-center gap-3 px-3 py-2 hover:bg-elevated transition-colors text-left"
                @click="selectSuggestion(user)"
              >
                <UAvatar
                  :src="user.avatar || undefined"
                  :alt="`${user.firstName} ${user.lastName}`"
                  size="xs"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-default truncate">
                    {{ user.firstName }} {{ user.lastName }}
                  </p>
                  <p class="text-xs text-muted truncate">
                    {{ user.email }}
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <USelectMenu
              v-model="role"
              :items="roleOptions"
              value-key="value"
              class="w-28"
              size="sm"
            />
            <UButton
              type="submit"
              label="Share"
              size="sm"
              :loading="sharing"
              :disabled="!canShare"
              class="ml-auto"
            />
          </div>
        </form>

        <p
          v-if="error"
          class="text-sm text-red-500"
        >
          {{ error }}
        </p>

        <p
          v-if="success"
          class="text-sm text-green-500"
        >
          {{ success }}
        </p>

        <!-- Collaborators list -->
        <div
          v-if="loading"
          class="py-4 flex justify-center"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="size-5 text-muted animate-spin"
          />
        </div>

        <div
          v-else-if="collaborators.length > 0"
          class="space-y-1"
        >
          <p class="text-xs font-semibold text-dimmed uppercase tracking-wider">
            People with access
          </p>
          <div
            v-for="collab in collaborators"
            :key="collab.id"
            class="flex items-center gap-3 py-2"
          >
            <UAvatar
              :src="collab.avatar || undefined"
              :alt="`${collab.firstName || ''} ${collab.lastName || ''}`"
              size="sm"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-default truncate">
                <template v-if="collab.firstName || collab.lastName">
                  {{ collab.firstName }} {{ collab.lastName }}
                </template>
                <template v-else>
                  {{ collab.email }}
                </template>
              </p>
              <p
                v-if="collab.firstName || collab.lastName"
                class="text-xs text-muted truncate"
              >
                {{ collab.email }}
              </p>
            </div>
            <div class="flex items-center gap-1.5">
              <UBadge
                v-if="collab.pending"
                label="Pending"
                variant="subtle"
                color="warning"
                size="sm"
              />
              <UBadge
                :label="collab.role"
                variant="subtle"
                :color="collab.role === 'owner' ? 'primary' : 'neutral'"
                size="sm"
              />
              <UButton
                v-if="collab.role !== 'owner'"
                icon="i-lucide-x"
                variant="ghost"
                color="neutral"
                size="xs"
                title="Remove access"
                @click="handleRevoke(collab)"
              />
            </div>
          </div>
        </div>

        <p
          v-else-if="!loading"
          class="text-sm text-muted py-2"
        >
          Only you have access. Add people by email above.
        </p>
      </div>
    </template>
  </UModal>
</template>
