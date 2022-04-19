<template>
	<div class="service-card" :class="cardClasses" :style="cardStyle">
		<div class="icon flex-grow-0 flex-shrink-0 mr-4">
			<img :src="filePath(`/icons/${service.key}.png`)" :alt="`${service.name} icon`" />
		</div>
		<div class="name-status flex flex-col flex-grow flex-shrink text-ellipsis">
			<div
				v-if="service.theme?.title"
				class="name text-xl font-bold"
				v-html="service.theme.title().innerHTML"
			></div>
			<div v-else class="name text-xl font-bold">{{ service.name }}</div>
			<div v-if="isActive" class="status mt-1">
				<Badge type="success">Logged in</Badge>
			</div>
		</div>
		<div class="actions flex flex-row flex-grow-0 flex-shrink-0 items-center">
			<div class="main-action">
				<Button v-if="!isActive" type="success" @click="activateServiceAndSave">Activate</Button>
				<template v-else>
					<Button type="success">Login</Button>
					<Button type="danger" class="ml-2" @click="deactivateServiceAndSave">Deactivate</Button>
				</template>
			</div>
			<div v-if="isActive" class="sub-actions flex flex-col ml-4">
				<Button type="info" size="sm" class="mb-2" :disabled="index(service.key) == 0" @click="moveUpAndSave">
					<i class="light-icon-chevron-up"></i>
				</Button>
				<Button type="info" size="sm" :disabled="isLast(service.key)" @click="moveDownAndSave">
					<i class="light-icon-chevron-down"></i>
				</Button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from "@vue/reactivity";
import { file } from "@Core/Utility";
import Service from "@Core/Service";
import Button from "./Button.vue";
import Badge from "./Badge.vue";
import { useOptions } from "../Hooks/Options";

const props = defineProps<{ service: Service }>();

const cardClasses: string[] = [];
const cardStyle: { borderColor: string | undefined; backgroundColor: string | undefined; color: string | undefined } = {
	borderColor: undefined,
	backgroundColor: undefined,
	color: undefined,
};
if (props.service.theme?.color) {
	cardStyle.borderColor = props.service.theme.color;
	cardStyle.color = props.service.theme.color;
} else cardClasses.push("border-tachikoma-500");
if (props.service.theme?.background) {
	cardStyle.backgroundColor = props.service.theme.background;
} else cardClasses.push("bg-tachikoma-600");

const { services, save } = useOptions();

const isActive = computed(() => {
	return services.has(props.service.key);
});
const index = services.index;
const isLast = services.isLast;

const loading = ref(false);
const activateServiceAndSave = async () => {
	loading.value = true;
	services.activate(props.service.key);
	await save();
	loading.value = false;
};
const deactivateServiceAndSave = async () => {
	loading.value = true;
	services.deactivate(props.service.key);
	await save();
	loading.value = false;
};

const moveUpAndSave = async () => {
	loading.value = true;
	services.moveUp(props.service.key);
	await save();
	loading.value = false;
};
const moveDownAndSave = async () => {
	loading.value = true;
	services.moveDown(props.service.key);
	await save();
	loading.value = false;
};

const filePath = (path: string) => {
	return file(path);
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
