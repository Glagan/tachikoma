<template>
	<button class="button" :class="classes">
		<slot name="default"></slot>
	</button>
</template>

<script setup lang="ts">
import { computed } from "@vue/reactivity";

const props = defineProps<{
	type: "loading" | "success" | "danger" | "warning" | "info";
	size?: "sm" | "md";
}>();

const classes = computed(() => {
	return `${props.type} ${props.size ?? ""}`;
});
</script>

<style>
.button {
	@apply inline-block leading-tight text-center rounded shadow-md hover:shadow-lg focus:shadow-lg focus:outline-none focus:ring-0 active:shadow-lg transition duration-150 ease-in-out;
}
.button,
.button.md {
	@apply px-6 py-2.5 font-medium text-sm;
}
.button.sm {
	@apply px-4 py-2.5 font-medium text-xs;
}
.button.loading {
	@apply bg-purple-500 text-white hover:bg-purple-600  focus:bg-purple-600 active:bg-purple-700;
}
.button.success {
	@apply bg-lime-600 text-white hover:bg-lime-700  focus:bg-lime-700 active:bg-lime-800;
}
.button.danger {
	@apply bg-red-500 text-white hover:bg-red-600  focus:bg-red-600 active:bg-red-700;
}
.button.warning {
	@apply bg-yellow-500 text-white hover:bg-yellow-600  focus:bg-yellow-600 active:bg-yellow-700;
}
.button.info {
	@apply bg-blue-500 text-white hover:bg-blue-600  focus:bg-blue-600 active:bg-blue-700;
}
</style>
