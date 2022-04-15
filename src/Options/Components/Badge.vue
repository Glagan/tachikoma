<template>
	<span class="badge" :class="type"><slot name="default"></slot> </span>
</template>

<script setup lang="ts">
defineProps<{ type: "loading" | "success" | "danger" | "warning" | "info" }>();
</script>

<style scoped>
.badge {
	@apply text-sm inline-block py-1 px-2.5 leading-none text-center whitespace-nowrap align-baseline font-bold rounded;
}
.badge.loading {
	@apply bg-purple-600 text-white;
}
.badge.success {
	@apply bg-lime-600 text-white;
}
.badge.danger {
	@apply bg-red-600 text-white;
}
.badge.warning {
	@apply bg-yellow-500 text-white;
}
.badge.info {
	@apply bg-blue-400 text-white;
}
</style>
