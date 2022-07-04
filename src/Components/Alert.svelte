<script lang="ts">
	let className: string = "";
	export { className as class };
	export let type: "loading" | "success" | "error" | "warning" | "info";

	let icon: string = "";
	switch (type) {
		case "info":
			icon = "light-icon-info-circle";
			break;
		case "success":
			icon = "light-icon-circle-check";
			break;
		case "error":
			icon = "light-icon-circle-x";
			break;
		case "warning":
			icon = "light-icon-alert-triangle";
			break;
		case "loading":
			icon = "light-icon-dots-circle-horizontal";
			break;
	}
</script>

<div class={`alert ${type} ${className}`} role="alert">
	<i class={`w-6 h-6 mr-2 fill-current text-xl ${icon}`} />
	<span><slot /></span>
</div>

<style lang="postcss">
	.alert {
		@apply rounded-lg py-5 px-6 mb-3 text-base block border;
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
