<script lang="ts">
	import type { SvelteComponentTyped } from "svelte";
	import { InfoIcon, CheckCircleIcon, XCircleIcon, AlertCircleIcon, LoaderIcon } from "svelte-feather-icons";

	let className: string = "";
	export { className as class };
	export let type: "loading" | "success" | "error" | "warning" | "info";

	let icon: typeof SvelteComponentTyped<{ size?: string; class?: string }>;
	switch (type) {
		case "info":
			icon = InfoIcon;
			break;
		case "success":
			icon = CheckCircleIcon;
			break;
		case "error":
			icon = XCircleIcon;
			break;
		case "warning":
			icon = AlertCircleIcon;
			break;
		case "loading":
			icon = LoaderIcon;
			break;
	}
</script>

<div class={`alert ${type} ${className}`} role="alert">
	<svelte:component this={icon} size="24" class="inline mx-3" />
	<span><slot /></span>
</div>

<style lang="postcss">
	.alert {
		@apply rounded-lg px-6 pl-0 py-3 mb-3 text-base block border;
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
