<script setup lang="ts">
const { sidebarOpen, sidebarCollapsed } = useStorage()
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      v-model:open="sidebarOpen"
      v-model:collapsed="sidebarCollapsed"
      collapsible
      resizable
    >
      <template #default="{ collapsed }">
        <StorageSidebar :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
