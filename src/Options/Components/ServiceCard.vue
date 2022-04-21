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
				<Badge :type="statusColor[status]">{{ statusMap[status] }}</Badge>
			</div>
		</div>
		<div class="actions flex flex-row flex-grow-0 flex-shrink-0 items-center">
			<div class="main-action">
				<Button v-if="!isActive" type="success" @click="activateServiceAndSave">Activate</Button>
				<template v-else-if="status != ServiceStatus.LOADING">
					<template v-if="canLogin">
						<Button v-if="service.loginRedirect" type="success" @click="loginOrRedirect">
							<span>Login</span>
							<i class="light-icon-external-link w-3 ml-2"></i>
						</Button>
						<template v-else>
							<Button type="success" @click="loginOrRedirect">
								<span>Login</span>
								<i class="light-icon-login ml-2"></i>
							</Button>
							<Modal v-model="loginModalVisible">
								<template #header>Login</template>
								<template #default>
									<template v-if="!service.loginInformations">
										Missing login informations !
									</template>
									<template v-else>
										<template v-for="field in service.loginInformations">
											<input
												v-if="field.type == 'text'"
												:key="`text-${field.name}`"
												class="input"
												type="text"
												:name="field.name"
												:placeholder="field.label"
											/>
											<input
												v-else-if="field.type == 'password'"
												:key="`password-${field.name}`"
												class="input"
												type="password"
												:name="field.name"
												:placeholder="field.label"
											/>
										</template>
									</template>
								</template>
								<template #footer="{ hide }">
									<Button type="success" class="mr-2" @click="loginOrRedirect">
										<span>Login</span>
										<i class="light-icon-login ml-2"></i>
									</Button>
									<Button type="warning" @click="hide">Close</Button>
								</template>
							</Modal>
						</template>
					</template>
					<Button v-else-if="canLogout" type="info" @click="logout">
						<span>Logout</span>
						<i class="light-icon-logout w-3 ml-2"></i>
					</Button>
					<Button type="error" class="ml-2" @click="deactivateServiceAndSave">Deactivate</Button>
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
import { onMounted } from "vue";
import { windows } from "webextension-polyfill";
import { ref, computed } from "@vue/reactivity";
import { file } from "@Core/Utility";
import { AnyService, ServiceStatus } from "@Core/Service";
import Button from "./Button.vue";
import Badge from "./Badge.vue";
import Modal from "./Modal.vue";
import { useOptions } from "../Hooks/Options";
import { useStatus } from "../Hooks/Status";

const props = defineProps<{ service: AnyService }>();

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
const { description: statusMap, color: statusColor } = useStatus();
const status = ref<ServiceStatus>(ServiceStatus.LOADING);
const loginModalVisible = ref(false);

const canLogin = computed(() => {
	return status.value !== ServiceStatus.LOGGED_IN && status.value !== ServiceStatus.SERVICE_ERROR;
});
const canLogout = computed(() => {
	return status.value === ServiceStatus.LOGGED_IN && "logout" in props.service;
});

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

async function closeSelf() {
	const { id: windowId } = await windows.getCurrent();
	if (windowId) return windows.remove(windowId);
}

const loginOrRedirect = async () => {
	loading.value = true;
	if (props.service.loginRedirect) {
		const redirectUrl = await props.service.loginRedirect();
		const link = document.createElement("a");
		link.style.display = "none";
		link.href = redirectUrl;
		link.target = "_blank";
		link.rel = "noreferrer noopener";
		document.body.appendChild(link);
		link.click();
		link.remove();
		closeSelf();
	} else {
		loginModalVisible.value = true;
	}
	loading.value = false;
};
const logout = async () => {
	loading.value = true;
	if ("logout" in props.service && props.service.logout) {
		await props.service.logout();
	}
	await props.service.storage.clear();
	await loadStatus();
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

const loadStatus = async () => {
	if (isActive) {
		const serviceStatus = await props.service.status();
		status.value = serviceStatus.status;
	}
};
onMounted(loadStatus);

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
.input {
	@apply block w-full px-3 py-1.5 mb-2 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none;
}
.input:last-child {
	@apply mb-0;
}
</style>
