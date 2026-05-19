<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { TREE, allFiles, allStarred } from '~/data'
import { TAGS } from '~/data/tags'

const props = defineProps<{
  collapsed?: boolean
}>()

const { special, setSpecial, navigateToId, starredCount, sidebarCollapsed } = useStorage()

const specialItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Home',
    icon: 'i-lucide-house',
    active: special.value === 'home',
    click: () => setSpecial('home')
  },
  {
    label: 'Recents',
    icon: 'i-lucide-clock',
    active: special.value === 'recents',
    click: () => setSpecial('recents')
  },
  {
    label: 'Starred',
    icon: 'i-lucide-star',
    ...(!props.collapsed && { badge: { label: String(starredCount.value), color: 'neutral' as const, variant: 'subtle' as const } }),
    active: special.value === 'starred',
    click: () => setSpecial('starred')
  },
  {
    label: 'Shared with me',
    icon: 'i-lucide-share-2',
    ...(!props.collapsed && { badge: { label: '3', color: 'neutral' as const, variant: 'subtle' as const } }),
    active: special.value === 'shared',
    click: () => setSpecial('shared')
  },
  {
    label: 'Trash',
    icon: 'i-lucide-trash-2',
    active: special.value === 'trash',
    click: () => setSpecial('trash')
  },
  // Show Tags as an icon when sidebar is collapsed
  ...(props.collapsed
    ? [{
        label: 'Tags',
        icon: 'i-lucide-tags',
        active: special.value === 'tags',
        click: () => setSpecial('tags')
      }]
    : [])
])

const spaces = computed(() => TREE.children || [])

const expandedSpaces = ref<Record<string, boolean>>({
  personal: true,
  family: false,
  design: false,
  code: false
})

function toggleSpace(id: string) {
  expandedSpaces.value[id] = !expandedSpaces.value[id]
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Brand -->
    <div class="px-3 pt-3.5 pb-2">
      <StorageLogo :collapsed="collapsed" />
    </div>

    <!-- Search -->
    <div
      v-if="!collapsed"
      class="px-3 pb-2.5"
    >
      <UDashboardSearchButton class="w-full" />
    </div>

    <!-- Navigation -->
    <div class="flex-1 overflow-auto px-1.5">
      <!-- Special views -->
      <UNavigationMenu
        :items="specialItems"
        orientation="vertical"
        :ui="{ link: collapsed ? 'justify-center' : undefined }"
      />

      <!-- Spaces -->
      <div
        v-if="!collapsed"
        class="mt-4"
      >
        <div class="px-3 pb-1.5 text-xs font-semibold text-dimmed uppercase tracking-wider">
          Spaces
        </div>
        <div
          v-for="space in spaces"
          :key="space.id"
        >
          <!-- Space header -->
          <div
            class="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold text-muted hover:bg-elevated transition-colors cursor-pointer"
            @click="navigateToId(space.id)"
          >
            <span
              class="flex items-center justify-center size-4 text-dimmed hover:text-muted cursor-pointer"
              role="button"
              @click.stop="toggleSpace(space.id)"
            >
              <UIcon
                :name="expandedSpaces[space.id] ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                class="size-3"
              />
            </span>
            <span
              class="size-2.5 rounded-sm shrink-0"
              :style="{ background: space.color }"
            />
            <span class="flex-1 text-left truncate">{{ space.name }}</span>
            <span class="text-xs text-dimmed tabular-nums">
              {{ allFiles(space).length }}
            </span>
          </div>

          <!-- Expanded folders -->
          <div
            v-if="expandedSpaces[space.id] && space.children"
            class="ml-4"
          >
            <button
              v-for="folder in space.children.filter(c => c.type === 'folder')"
              :key="folder.id"
              class="w-full flex items-center gap-2 px-3 py-1 rounded-md text-sm text-muted hover:bg-elevated transition-colors"
              @click="navigateToId(folder.id)"
            >
              <UIcon
                name="i-lucide-folder"
                class="size-3.5 text-dimmed shrink-0"
              />
              <span class="truncate">{{ folder.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Tags -->
      <div
        v-if="!collapsed"
        class="mt-4"
      >
        <div class="px-3 pb-1.5 text-xs font-semibold text-dimmed uppercase tracking-wider">
          Tags
        </div>
        <button
          v-for="tag in TAGS"
          :key="tag.id"
          class="w-full flex items-center gap-2.5 px-4.5 py-1 text-sm text-muted hover:bg-elevated transition-colors rounded-md"
        >
          <span
            class="size-2 rounded-full shrink-0"
            :style="{ background: tag.color }"
          />
          <span>{{ tag.label }}</span>
        </button>
      </div>
    </div>

    <!-- Footer: storage gauge -->
    <div
      v-if="!collapsed"
      class="px-3 py-3 border-t border-default"
    >
      <div class="flex items-center mb-2">
        <span class="text-xs text-muted flex-1">1.2 GB of 50 GB</span>
        <UColorModeButton size="xs" />
      </div>
      <UProgress
        :value="2.4"
        :max="100"
        size="xs"
        color="primary"
      />
    </div>
    <div
      v-else
      class="p-2 border-t border-default flex justify-center"
    >
      <UColorModeButton size="xs" />
    </div>
  </div>
</template>
