<script setup lang="ts">
import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui'

const props = defineProps<{
  collapsed?: boolean
}>()

const { navigateToSpace, starredCount, spaces, tags, createSpace, deleteSpace, deleteTag } = useStorage()
const { user, logout } = useAuth()
const { onboarding: t } = useContent()
const route = useRoute()

const SPACE_COLORS = [
  '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
]

const showNewSpace = ref(false)
const newSpaceName = ref('')
const newSpaceColor = ref(SPACE_COLORS[0])
const creatingSpace = ref(false)
const spacesHovered = ref(false)

async function handleCreateSpace() {
  const name = newSpaceName.value.trim()
  if (!name) return
  creatingSpace.value = true
  try {
    const space = await createSpace(name, newSpaceColor.value ?? '#10b981')
    showNewSpace.value = false
    newSpaceName.value = ''
    newSpaceColor.value = SPACE_COLORS[0]
    if (space) navigateToSpace(space.id)
  } finally {
    creatingSpace.value = false
  }
}

async function handleDeleteTag(id: string) {
  await deleteTag(id)
}

const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: user.value?.email || '',
      disabled: true
    }
  ],
  [
    {
      label: 'Sign out',
      icon: 'i-lucide-log-out',
      onSelect: () => logout()
    }
  ]
])

const specialItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Home',
    icon: 'i-lucide-house',
    to: '/home',
    active: route.path === '/home'
  },
  {
    label: 'Recents',
    icon: 'i-lucide-clock',
    to: '/recents',
    active: route.path === '/recents'
  },
  {
    label: 'Starred',
    icon: 'i-lucide-star',
    ...(!props.collapsed && starredCount.value > 0 && { badge: { label: String(starredCount.value), color: 'neutral' as const, variant: 'subtle' as const } }),
    to: '/starred',
    active: route.path === '/starred'
  },
  {
    label: 'Shared with me',
    icon: 'i-lucide-share-2',
    to: '/shared',
    active: route.path === '/shared'
  },
  {
    label: 'Shared by me',
    icon: 'i-lucide-send',
    to: '/shared-by-me',
    active: route.path === '/shared-by-me'
  },
  {
    label: 'Trash',
    icon: 'i-lucide-trash-2',
    to: '/trash',
    active: route.path === '/trash'
  },
  {
    label: 'Activity',
    icon: 'i-lucide-activity',
    to: '/activity',
    active: route.path === '/activity'
  },
  ...(props.collapsed
    ? [{
        label: 'Tags',
        icon: 'i-lucide-tags',
        to: '/tags',
        active: route.path === '/tags'
      }]
    : [])
])
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Brand -->
    <div :class="collapsed ? 'pt-3.5 pb-2 flex justify-center' : 'px-3 pt-3.5 pb-2'">
      <StorageLogo :collapsed="collapsed" />
    </div>

    <!-- Search -->
    <div
      v-if="!collapsed"
      class="px-3 pb-2.5"
    >
      <TooltipHint
        hint-id="search"
        :title="t.hints.search.title"
        :description="t.hints.search.description"
        icon="i-lucide-search"
        side="right"
      >
        <UDashboardSearchButton class="w-full" />
      </TooltipHint>
    </div>

    <!-- Navigation -->
    <div
      class="flex-1 overflow-auto"
      :class="collapsed ? 'px-0' : 'px-1.5'"
    >
      <!-- Special views -->
      <UNavigationMenu
        :items="specialItems"
        orientation="vertical"
        :collapsed="collapsed"
      />

      <!-- Spaces (collapsed: dots with tooltips) -->
      <div
        v-if="collapsed"
        class="mt-4 flex flex-col items-center gap-3 py-2"
        @mouseenter="spacesHovered = true"
        @mouseleave="spacesHovered = false"
      >
        <UTooltip
          v-for="space in spaces"
          :key="space.id"
          :text="space.name"
          :open="spacesHovered"
          :content="{ side: 'right' }"
        >
          <button
            class="size-3 rounded-sm hover:scale-125 transition-transform"
            :style="{ background: space.color }"
            @click="navigateToSpace(space.id)"
          />
        </UTooltip>

        <UPopover
          v-model:open="showNewSpace"
          :content="{ side: 'right' }"
        >
          <UTooltip
            text="New space"
            :content="{ side: 'right' }"
            :open="!showNewSpace ? undefined : false"
          >
            <UButton
              icon="i-lucide-plus"
              variant="ghost"
              color="neutral"
              size="xs"
            />
          </UTooltip>
          <template #content>
            <div class="p-4 w-64 space-y-3">
              <p class="text-sm font-semibold text-default">
                New Space
              </p>
              <UInput
                v-model="newSpaceName"
                placeholder="Space name"
                size="sm"
                autofocus
                @keydown.enter="handleCreateSpace"
                @keydown.escape="showNewSpace = false"
              />
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="color in SPACE_COLORS"
                  :key="color"
                  class="size-6 rounded-full ring-offset-2 ring-offset-default transition-shadow"
                  :class="newSpaceColor === color ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-muted'"
                  :style="{ background: color }"
                  @click="newSpaceColor = color"
                />
              </div>
              <div class="flex justify-end gap-2 pt-1">
                <UButton
                  label="Cancel"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  @click="showNewSpace = false"
                />
                <UButton
                  label="Create"
                  size="xs"
                  :loading="creatingSpace"
                  :disabled="!newSpaceName.trim()"
                  @click="handleCreateSpace"
                />
              </div>
            </div>
          </template>
        </UPopover>
      </div>

      <!-- Spaces (expanded: full list) -->
      <div
        v-if="!collapsed"
        class="mt-4"
      >
        <TooltipHint
          hint-id="sidebar-spaces"
          :title="t.hints.sidebarSpaces.title"
          :description="t.hints.sidebarSpaces.description"
          icon="i-lucide-layers"
          side="right"
        >
          <div class="flex items-center justify-between px-3 pb-1.5">
            <span class="text-xs font-semibold text-dimmed uppercase tracking-wider">
              Spaces
            </span>
          <UPopover v-model:open="showNewSpace">
            <UButton
              icon="i-lucide-plus"
              variant="ghost"
              color="neutral"
              size="xs"
            />
            <template #content>
              <div class="p-4 w-64 space-y-3">
                <p class="text-sm font-semibold text-default">
                  New Space
                </p>
                <UInput
                  v-model="newSpaceName"
                  placeholder="Space name"
                  size="sm"
                  autofocus
                  @keydown.enter="handleCreateSpace"
                  @keydown.escape="showNewSpace = false"
                />
                <div class="grid grid-cols-4 gap-2">
                  <button
                    v-for="color in SPACE_COLORS"
                    :key="color"
                    class="size-6 rounded-full ring-offset-2 ring-offset-default transition-shadow"
                    :class="newSpaceColor === color ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-muted'"
                    :style="{ background: color }"
                    @click="newSpaceColor = color"
                  />
                </div>
                <div class="flex justify-end gap-2 pt-1">
                  <UButton
                    label="Cancel"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    @click="showNewSpace = false"
                  />
                  <UButton
                    label="Create"
                    size="xs"
                    :loading="creatingSpace"
                    :disabled="!newSpaceName.trim()"
                    @click="handleCreateSpace"
                  />
                </div>
              </div>
            </template>
          </UPopover>
        </div>
        </TooltipHint>

        <div
          v-if="spaces.length === 0 && !showNewSpace"
          class="px-3 py-2.5"
        >
          <p class="text-xs text-dimmed leading-relaxed">
            {{ t.sidebar.noSpaces.message }}
          </p>
          <button
            class="mt-1.5 text-xs font-medium text-primary hover:underline"
            @click="showNewSpace = true"
          >
            {{ t.sidebar.noSpaces.cta }}
          </button>
        </div>

        <UContextMenu
          v-for="space in spaces"
          :key="space.id"
          :items="[[{ label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => deleteSpace(space.id) }]]"
        >
          <div
            class="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold text-muted hover:bg-elevated transition-colors cursor-pointer"
            @click="navigateToSpace(space.id)"
          >
            <span
              class="size-2.5 rounded-sm shrink-0"
              :style="{ background: space.color }"
            />
            <span class="flex-1 text-left truncate">{{ space.name }}</span>
          </div>
        </UContextMenu>
      </div>

      <!-- Tags -->
      <div
        v-if="!collapsed && tags.length > 0"
        class="mt-4"
      >
        <div class="px-3 pb-1.5 text-xs font-semibold text-dimmed uppercase tracking-wider">
          Tags
        </div>
        <UContextMenu
          v-for="tag in tags"
          :key="tag.id"
          :items="[[{ label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => handleDeleteTag(tag.id) }]]"
        >
          <NuxtLink
            :to="`/tags/${tag.id}`"
            class="w-full flex items-center gap-2.5 px-4.5 py-1 text-sm text-muted hover:bg-elevated transition-colors rounded-md"
          >
            <span
              class="size-2 rounded-full shrink-0"
              :style="{ background: tag.color }"
            />
            <span>{{ tag.label }}</span>
          </NuxtLink>
        </UContextMenu>
      </div>
    </div>

    <!-- User profile -->
    <div
      class="border-t border-default"
      :class="collapsed ? 'pt-2' : ''"
    >
      <UDropdownMenu
        :items="userMenuItems"
        :popper="{ placement: 'top-start' }"
      >
        <button
          v-if="user"
          class="w-full flex items-center gap-2.5 py-2.5 hover:bg-elevated transition-colors"
          :class="collapsed ? 'justify-center' : 'px-3'"
        >
          <UAvatar
            :src="user.avatar || undefined"
            :alt="`${user.firstName} ${user.lastName}`"
            size="sm"
          />
          <div
            v-if="!collapsed"
            class="flex-1 text-left min-w-0"
          >
            <p class="text-sm font-medium text-default truncate">
              {{ user.firstName }} {{ user.lastName }}
            </p>
            <p class="text-xs text-dimmed truncate">
              {{ user.email }}
            </p>
          </div>
          <UIcon
            v-if="!collapsed"
            name="i-lucide-chevrons-up-down"
            class="size-4 text-dimmed shrink-0"
          />
        </button>
      </UDropdownMenu>
    </div>

    <!-- Footer: storage gauge -->
    <div
      v-if="!collapsed"
      class="px-3 py-3 border-t border-default"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-muted">5 GB of 50 GB</span>
        <UColorModeButton size="xs" />
      </div>
      <UProgress
        :model-value="10"
        :max="100"
        size="xs"
        color="primary"
        animation="carousel"
      />
    </div>
    <div
      v-else
      class="py-3 border-t border-default flex justify-center"
    >
      <UColorModeButton size="sm" />
    </div>
  </div>
</template>
