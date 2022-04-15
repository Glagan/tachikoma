<template>
	<div class="service-card bg-tachikoma-600 border-tachikoma-500">
		<div class="icon flex-grow-0 flex-shrink-0 mr-4">
			<img :src="filePath(`/icons/${service.key}.png`)" :alt="`${service.name} icon`" />
		</div>
		<div class="name-status flex flex-col flex-grow flex-shrink text-ellipsis">
			<div class="name text-xl font-bold">{{ service.name }}</div>
			<div class="status mt-1">
				<Badge type="success">Logged in</Badge>
			</div>
		</div>
		<div class="actions flex flex-row flex-grow-0 flex-shrink-0 items-center">
			<div class="main-action">
				<Button v-if="!isActive" type="success" @click="activateService">Activate</Button>
				<Button v-else="isActive" type="success">Login</Button>
			</div>
			<div v-if="isActive" class="sub-actions flex flex-col ml-4">
				<Button type="info" size="sm" class="mb-2"><i class="light-icon-chevron-up"></i></Button>
				<Button type="info" size="sm"><i class="light-icon-chevron-down"></i></Button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from "@vue/reactivity";
import { file } from "@Core/Utility";
import Service from "@Core/Service";
import { Options } from "@Core/Options";
import Button from "./Button.vue";
import Badge from "./Badge.vue";

const props = defineProps<{ service: Service }>();

const isActive = computed(() => {
	return Options.hasService(props.service.key);
});

const filePath = (path: string) => {
	return file(path);
};

const loading = ref(false);
const activateService = async () => {
	loading.value = true;
	Options.enableService(props.service.key);
	await Options.save();
	loading.value = false;
};
</script>

<style scoped>
.service-card {
	@apply m-4 px-4 py-2 flex flex-row items-center rounded-md border shadow-md;
}
.service-card:last-child {
	@apply mb-0;
}
</style>
