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
				<Badge :type="statusMap.color[status]">{{ statusMap.description[status] }}</Badge>
			</div>
		</div>
		<div class="actions flex flex-row flex-grow-0 flex-shrink-0 items-center">
			<div class="main-action">
				<Button v-if="!isActive" type="success" @click="activateServiceAndSave">Activate</Button>
				<template v-else-if="status != ServiceStatus.LOADING">
					<template v-if="canLogin">
						<Button v-if="service.loginRedirect" type="success" @click="loginOrRedirect">
							<span>Login</span>
							<i class="light-icon-external-link text-lg ml-2"></i>
						</Button>
						<template v-else>
							<Button type="success" @click="loginOrRedirect">
								<span>Login</span>
								<i class="light-icon-login text-lg ml-2"></i>
							</Button>
							<Modal v-model="loginModalVisible">
								<template #header>Login</template>
								<template #default>
									<template v-if="!service.loginInformations">
										Missing login informations !
									</template>
									<template v-else>
										<input
											v-for="field in service.loginInformations"
											:key="`password-${field.name}`"
											v-model="loginInformations[field.name]"
											class="input"
											:type="field.type"
											:name="field.name"
											:placeholder="field.label"
											:required="field.required"
										/>
									</template>
									<Alert
										v-if="loginResult && loginResult.status !== ServiceLogin.SUCCESS"
										:type="loginMap.color[loginResult.status]"
									>
										{{ loginMap.description[loginResult.status] }}
									</Alert>
								</template>
								<template #footer="{ hide }">
									<Button
										type="success"
										:disabled="loggingIn"
										class="mr-2"
										@click="sendLoginInformations"
									>
										<span>Login</span>
										<i class="light-icon-login text-lg ml-2"></i>
									</Button>
									<Button type="warning" :disabled="loggingIn" @click="hide">Close</Button>
								</template>
							</Modal>
						</template>
					</template>
					<Button v-if="canLogout" type="info" class="ml-2" @click="logout">
						<span>Logout</span>
						<i class="light-icon-logout text-lg ml-2"></i>
					</Button>
					<Button type="error" class="ml-2" @click="deactivateServiceAndSave">Deactivate</Button>
				</template>
			</div>
			<div v-if="isActive" class="sub-actions flex flex-col ml-4">
				<Button type="info" size="sm" class="mb-2" :disabled="index(service.key) == 0" @click="moveUpAndSave">
					<i class="light-icon-chevron-up text-lg"></i>
				</Button>
				<Button type="info" size="sm" :disabled="isLast(service.key)" @click="moveDownAndSave">
					<i class="light-icon-chevron-down text-lg"></i>
				</Button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { windows, tabs } from "webextension-polyfill";
import { ref, computed } from "@vue/reactivity";
import { file } from "@Core/Utility";
import { AnyService, ServiceStatus, ServiceLogin } from "@Core/Service";
import Button from "./Button.vue";
import Badge from "./Badge.vue";
import Modal from "./Modal.vue";
import Alert from "./Alert.vue";
import { useOptions } from "../Hooks/Options";
import { useService } from "../Hooks/Service";

const props = defineProps<{ service: AnyService }>();

// * Style

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

//

const { services, save } = useOptions();
const { status: statusMap, login: loginMap } = useService();
const status = ref<ServiceStatus>(ServiceStatus.LOADING);
const loginModalVisible = ref(false);
const loginInformations = ref<ServiceLoginInformations>({});
const loginResult = ref<{ status: ServiceLogin; message?: string } | null>(null);
const loggingIn = ref(false);

const canLogin = computed(() => {
	return status.value !== ServiceStatus.LOGGED_IN && status.value !== ServiceStatus.SERVICE_ERROR;
});
const canLogout = computed(() => {
	return (
		status.value !== ServiceStatus.MISSING_COOKIES &&
		status.value !== ServiceStatus.MISSING_TOKEN &&
		"logout" in props.service
	);
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
	loginResult.value = null;
	loading.value = true;
	if (props.service.loginRedirect) {
		const redirectUrl = await props.service.loginRedirect();
		// const link = document.createElement("a");
		// link.style.display = "none";
		// link.href = redirectUrl;
		// link.target = "_blank";
		// link.rel = "noreferrer noopener";
		// document.body.appendChild(link);
		// link.click();
		// link.remove();
		await tabs.create({ url: redirectUrl, active: true });
		// closeSelf();
	} else {
		loginModalVisible.value = true;
	}
	loading.value = false;
};
const sendLoginInformations = async () => {
	loggingIn.value = true;
	loginResult.value = { status: ServiceLogin.LOADING };
	if ("login" in props.service) {
		loginResult.value = await props.service.login(loginInformations.value);
		if (loginResult.value.status === ServiceLogin.SUCCESS) {
			loadStatus();
			loginModalVisible.value = false;
		}
	}
	loggingIn.value = false;
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
