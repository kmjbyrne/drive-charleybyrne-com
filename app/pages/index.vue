<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const { load } = useSessionRestore()
const session = load()
await navigateTo(session.route || '/home', { redirectCode: 302 })
</script>
