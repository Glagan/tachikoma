<template>
	<span class="badge" :class="type"><slot name="default"></slot> </span>
</template>

<script setup lang="ts">
defineProps<{ type: "loading" | "success" | "error" | "warning" | "info" }>();
</script>

<style scoped>
.badge {
	@apply text-sm inline-block py-1 px-2.5 leading-none text-center whitespace-nowrap align-baseline font-bold rounded border;
	text-shadow: 1px 1px 3px black;
}
.badge.loading {
	@apply bg-purple-600 border-purple-500 text-white;
}
.badge.success {
	@apply bg-lime-600 border-lime-500 text-white;
}
.badge.error {
	@apply bg-red-600 border-red-500 text-white;
}
.badge.warning {
	@apply bg-yellow-500 border-yellow-400 text-white;
}
.badge.info {
	@apply bg-blue-400 border-blue-300 text-white;
}
</style>
