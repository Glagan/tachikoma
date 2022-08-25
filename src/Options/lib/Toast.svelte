<script lang="ts">
	import { fade } from "svelte/transition";
	import { cubicInOut } from "svelte/easing";
	import type { Toast } from "../stores/Toasts";

	export let toast: Toast;
</script>

<div
	class="toast"
	class:info={toast.type === "info"}
	class:success={toast.type === "success"}
	class:error={toast.type === "error"}
	transition:fade={{ duration: 250, easing: cubicInOut }}
>
	{toast.message}
</div>

<style lang="postcss">
	.toast {
		@apply p-3 py-1 mb-2 rounded border shadow-md max-w-md;
	}

	.info {
		@apply bg-blue-300 text-blue-600 border-blue-600;
	}

	.success {
		@apply bg-green-300 text-green-700 border-green-700;
	}

	.error {
		@apply bg-red-300 text-red-600 border-red-600;
	}
</style>
