<script lang="ts">
	import { onMount } from "svelte";
	import { tabs } from "webextension-polyfill";
	import { Lake } from "@Core/Lake";
	import { file } from "@Core/Utility";
	import { loginResultMap, loginStatusMap, ServiceLogin, ServiceStatus } from "@Core/Service";
	import { optionsStore } from "../stores/Options";
	import Button from "@Components/Button.svelte";
	import Badge from "@Components/Badge.svelte";
	import Modal from "@Components/Modal.svelte";
	import Alert from "@Components/Alert.svelte";

	export let serviceKey: string;

	let loading = false;
	const service = Lake.services.find((service) => service.key === serviceKey)!;
	$: isActive = $optionsStore ? $optionsStore.services.includes(serviceKey) : false;

	let modal: Modal;

	let cardClasses = "service-card";
	let cardStyle = "";
	let status: ServiceStatus = ServiceStatus.LOADING;
	let loggedUser: string | undefined;
	if (service) {
		if (service.theme?.color) {
			cardStyle = `border-color: ${service.theme.color}; color: ${service.theme.color};`;
		} else {
			cardClasses = `${cardClasses} border-tachikoma-500`;
		}
		if (service.theme?.background) {
			cardStyle = `${cardStyle} background-color: ${service.theme.background};`;
		} else {
			cardClasses = `${cardClasses} bg-tachikoma-600`;
		}
	}

	// Management functions

	async function loadStatus() {
		status = ServiceStatus.LOADING;
		loggedUser = undefined;
		if (isActive) {
			const serviceStatus = await service.status();
			status = serviceStatus.status;
			loggedUser = serviceStatus.user;
		}
	}

	let loginResult: { status: ServiceLogin; message?: string } | null = null;
	async function loginOrRedirect() {
		loginResult = null;
		loading = true;
		if (service.loginRedirect) {
			const redirectUrl = await service.loginRedirect();
			await tabs.create({ url: redirectUrl, active: true });
		} else {
			modal.show();
		}
		loading = false;
	}

	let loginInformations: ServiceLoginInformations = {};
	let loggingIn = false;
	async function sendLoginInformations() {
		loggingIn = true;
		loginResult = { status: ServiceLogin.LOADING };
		if ("login" in service) {
			loginResult = await service.login(loginInformations);
			if (loginResult.status === ServiceLogin.SUCCESS) {
				loadStatus();
				modal.hide();
			}
		}
		loggingIn = false;
	}

	async function logout() {
		loading = true;
		if ("logout" in service && service.logout) {
			await service.logout();
		}
		await service.storage.clear();
		await loadStatus();
		loading = false;
	}

	async function activateServiceAndSave() {
		loading = true;
		optionsStore.activateService(serviceKey);
		await optionsStore.save();
		loading = false;
	}

	async function deactivateServiceAndSave() {
		loading = true;
		await logout();
		optionsStore.deactivateService(serviceKey);
		await optionsStore.save();
		loading = false;
	}

	async function moveUpAndSave() {
		loading = true;
		optionsStore.moveServiceUp(serviceKey);
		await optionsStore.save();
		loading = false;
	}

	async function moveDownAndSave() {
		loading = true;
		optionsStore.moveServiceDown(serviceKey);
		await optionsStore.save();
		loading = false;
	}

	//

	$: canLogin = status !== ServiceStatus.LOGGED_IN && status !== ServiceStatus.SERVICE_ERROR;
	$: canLogout =
		status !== ServiceStatus.MISSING_COOKIES && status !== ServiceStatus.MISSING_TOKEN && "logout" in service;
	$: isFirst = $optionsStore?.services.indexOf(serviceKey) === 0;
	$: isLast =
		$optionsStore !== null && $optionsStore.services.indexOf(serviceKey) === $optionsStore.services.length - 1;

	// Maps

	const statusMap: {
		description: { [key in ServiceStatus]: string };
		color: { [key in ServiceStatus]: "loading" | "success" | "error" | "warning" | "info" };
	} = {
		description: loginStatusMap,
		color: {
			[ServiceStatus.MISSING_TOKEN]: "warning",
			[ServiceStatus.MISSING_COOKIES]: "warning",
			[ServiceStatus.INVALID_TOKEN]: "warning",
			[ServiceStatus.SERVICE_ERROR]: "error",
			[ServiceStatus.TACHIKOMA_ERROR]: "warning",
			[ServiceStatus.LOADING]: "info",
			[ServiceStatus.LOGGED_IN]: "success",
		},
	};

	const loginMap: {
		description: { [key in ServiceLogin]: string };
		color: { [key in ServiceLogin]: "loading" | "success" | "error" | "warning" | "info" };
	} = {
		description: loginResultMap,
		color: {
			[ServiceLogin.MISSING_FIELDS]: "warning",
			[ServiceLogin.EXPIRED_CHALLENGE]: "warning",
			[ServiceLogin.INVALID_CREDENTIALS]: "error",
			[ServiceLogin.INVALID_CHALLENGE]: "error",
			[ServiceLogin.SERVICE_ERROR]: "error",
			[ServiceLogin.TACHIKOMA_ERROR]: "warning",
			[ServiceLogin.LOADING]: "info",
			[ServiceLogin.SUCCESS]: "success",
		},
	};

	//

	onMount(() => {
		loadStatus();
	});
</script>

{#if service}
	<div class={cardClasses} style={cardStyle}>
		<div class="icon flex-grow-0 flex-shrink-0 mr-4">
			<img src={file(`/static/icons/${service.key}.png`)} alt={`${service.name} icon`} />
		</div>
		<div class="name-status flex flex-col flex-grow flex-shrink text-ellipsis">
			{#if service.theme?.title}
				<div class="name text-xl font-bold">{@html service.theme.title().innerHTML}</div>
			{:else}
				<div class="name text-xl font-bold">{service.name}</div>
			{/if}
			{#if isActive}
				<div class="status mt-1">
					<Badge type={statusMap.color[status]}>{statusMap.description[status]}</Badge>
				</div>
				{#if loggedUser}
					<div class="mt-1 ">
						<Badge type="info">{loggedUser}</Badge>
					</div>
				{/if}
			{/if}
		</div>
		<div class="actions flex flex-row flex-grow-0 flex-shrink-0 items-center">
			<div class="main-action flex items-center">
				{#if !isActive}
					<Button type="success" disabled={loading} on:click={activateServiceAndSave}>Activate</Button>
				{:else if status != ServiceStatus.LOADING}
					{#if canLogin}
						{#if service.loginRedirect}
							<Button type="success" on:click={loginOrRedirect}>
								<span>Login</span>
								<i class="light-icon-external-link text-lg ml-2" />
							</Button>
						{:else}
							<Button type="success" on:click={loginOrRedirect}>
								<span>Login</span>
								<i class="light-icon-login text-lg ml-2" />
							</Button>
							<Modal bind:this={modal} let:hide>
								<span slot="header">Login</span>
								<div slot="default">
									{#if !service.loginInformations}
										Missing login informations !
									{:else}
										{#each service.loginInformations as field (field.name)}
											<!-- ? `'type' attribute cannot be dynamic if input uses two-way binding`  -->
											{#if field.type == "password"}
												<input
													bind:value={loginInformations[field.name]}
													class="input"
													type="password"
													name={field.name}
													placeholder={field.label}
													required={field.required}
												/>
											{:else if field.type == "email"}
												<input
													bind:value={loginInformations[field.name]}
													class="input"
													type="email"
													name={field.name}
													placeholder={field.label}
													required={field.required}
												/>
											{:else}
												<input
													bind:value={loginInformations[field.name]}
													class="input"
													type="text"
													name={field.name}
													placeholder={field.label}
													required={field.required}
												/>
											{/if}
										{/each}
									{/if}
									{#if loginResult && loginResult.status !== ServiceLogin.SUCCESS}
										<Alert type={loginMap.color[loginResult.status]}>
											{loginMap.description[loginResult.status]}
										</Alert>
									{/if}
								</div>
								<div slot="footer">
									<Button
										type="success"
										disabled={loggingIn}
										class="mr-2"
										on:click={sendLoginInformations}
									>
										<span>Login</span>
										<i class="light-icon-login text-lg ml-2" />
									</Button>
									<Button type="warning" disabled={loggingIn} on:click={hide}>Close</Button>
								</div>
							</Modal>
						{/if}
					{/if}
					{#if canLogout}
						<Button type="info" class="ml-2" on:click={logout}>
							<span>Logout</span>
							<i class="light-icon-rotate-2 text-lg ml-2" />
						</Button>
					{/if}
				{/if}
				{#if isActive}
					<Button
						title="Deactivate"
						type="error"
						class="ml-2"
						disabled={loading}
						on:click={deactivateServiceAndSave}
					>
						<i class="light-icon-trash text-lg" />
					</Button>
				{/if}
			</div>
			{#if isActive}
				<div class="sub-actions flex flex-col ml-4">
					<Button type="info" size="sm" class="mb-2" disabled={isFirst} on:click={moveUpAndSave}>
						<i class="light-icon-chevron-up text-lg" />
					</Button>
					<Button type="info" size="sm" disabled={isLast} on:click={moveDownAndSave}>
						<i class="light-icon-chevron-down text-lg" />
					</Button>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<div class={cardClasses} style={cardStyle}>Invalid service</div>
{/if}

<style lang="postcss">
	.service-card {
		@apply m-4 px-4 py-2 flex flex-row items-center rounded-md border shadow-md;
	}
	.input {
		@apply block w-full px-3 py-1.5 mb-2 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none;
	}
	.input:last-child {
		@apply mb-0;
	}
</style>
