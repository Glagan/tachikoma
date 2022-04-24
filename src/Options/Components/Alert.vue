<template>
	<div class="alert" :class="type" role="alert">
		<i class="w-6 h-6 mr-2 fill-current text-xl" :class="icon"></i>
		<span><slot name="default"></slot></span>
	</div>
</template>

<script setup lang="ts">
import { computed } from "@vue/reactivity";

const props = defineProps<{ type: "loading" | "success" | "error" | "warning" | "info" }>();
const icon = computed(() => {
	switch (props.type) {
		case "info":
			return "light-icon-info-circle";
		case "success":
			return "light-icon-circle-check";
		case "error":
			return "light-icon-circle-x";
		case "warning":
			return "light-icon-alert-triangle";
		case "loading":
			return "light-icon-dots-circle-horizontal";
	}
});
</script>

<style scoped>
.alert {
	@apply rounded-lg py-5 px-6 mb-3 text-base inline-flex items-center w-full border;
}

.alert.loading {
	@apply bg-purple-100 border-purple-700 text-purple-700;
}
.alert.success {
	@apply bg-lime-100 border-lime-700 text-lime-700;
}
.alert.error {
	@apply bg-red-100 border-red-700 text-red-700;
}
.alert.warning {
	@apply bg-yellow-100 border-yellow-700 text-yellow-700;
}
.alert.info {
	@apply bg-blue-100 border-blue-700 text-blue-700;
}
</style>
