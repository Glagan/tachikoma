<template>
	<component :is="titleTag" class="p-4 border-b border-b-gray" :class="titleTextSize">
		<slot name="default"></slot>
	</component>
</template>

<script setup lang="ts">
import { computed } from "@vue/reactivity";

const props = defineProps<{ size: 1 | 2 | 3 | 4 | "1" | "2" | "3" | "4" }>();

const titleTag = computed(() => {
	return `h${props.size}`;
});
const titleTextSize = computed(() => {
	switch (props.size) {
		case "1":
		case 1:
			return "text-3xl";
		case "2":
		case 2:
			return "text-2xl";
		case "3":
		case 3:
			return "text-xl";
		case "4":
		case 4:
			return "text-lg";
	}
});
</script>

<style></style>
