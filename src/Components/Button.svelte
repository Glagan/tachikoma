<script lang="ts">
	let className: string = "";
	export { className as class };

	export let type: "loading" | "success" | "error" | "warning" | "info" = "info";
	export let size: "sm" | "md" | "lg" | undefined = "md";
	export let disabled: boolean | undefined = false;
	export let block: boolean | undefined = false;
	// Convert the button to a link
	export let href: string | undefined = undefined;
	export let target: "_blank" | undefined = undefined;
	export let rel: "noreferrer" | "noopener" | "noreferrer noopener" | undefined = undefined;

	let classes = `${className} button ${type} ${size ? size : ""} ${block ? "block" : ""}`;
</script>

<svelte:element this={href ? "a" : "button"} class={classes} {disabled} {href} {target} {rel} on:click>
	<slot />
</svelte:element>

<style lang="postcss">
	/** Add text-shadow */
	.button {
		@apply inline-flex items-center leading-tight text-center rounded shadow-md hover:shadow-lg focus:shadow-lg focus:outline-none focus:ring-0 active:shadow-lg transition duration-150 ease-in-out;
		text-shadow: 1px 1px 3px black;
	}

	.button,
	.button.md {
		@apply px-6 py-2.5 font-medium;
	}
	.button.sm {
		@apply px-4 py-2.5 font-medium text-sm;
	}
	.button.lg {
		@apply px-7 py-3 font-normal text-base;
	}

	.button.loading {
		@apply bg-purple-500 text-white hover:bg-purple-600  focus:bg-purple-600 active:bg-purple-700;
	}
	.button.success {
		@apply bg-lime-600 text-white hover:bg-lime-700  focus:bg-lime-700 active:bg-lime-800;
	}
	.button.error {
		@apply bg-red-500 text-white hover:bg-red-600  focus:bg-red-600 active:bg-red-700;
	}
	.button.warning {
		@apply bg-yellow-500 text-white hover:bg-yellow-600  focus:bg-yellow-600 active:bg-yellow-700;
	}
	.button.info {
		@apply bg-blue-500 text-white hover:bg-blue-600  focus:bg-blue-600 active:bg-blue-700;
	}

	.button:disabled,
	.button.disabled {
		@apply pointer-events-none opacity-60;
	}

	.button.block {
		@apply w-full;
	}
</style>
