<script context="module" lang="ts">
	export type BadgeType = "loading" | "success" | "error" | "warning" | "info";
</script>

<script lang="ts">
	export let type: BadgeType;
	let classes: string | undefined = undefined;
	export { classes as class };
</script>

<div on:click on:keydown on:keyup on:keypress>
	<span class={`badge ${type} ${classes ? classes : ""}`}>
		<slot />
	</span>
</div>

<style lang="postcss">
	.badge {
		@apply text-sm inline-block py-1 px-2.5 leading-none text-center whitespace-nowrap align-baseline font-bold rounded border;
		text-shadow: 1px 1px 3px black;
	}
	.badge.loading {
		@apply bg-purple-600 border-purple-500 text-white;
	}
	.badge.success {
		@apply bg-lime-600 border-lime-500 text-white;
	}
	.badge.error {
		@apply bg-red-600 border-red-500 text-white;
	}
	.badge.warning {
		@apply bg-yellow-500 border-yellow-400 text-white;
	}
	.badge.info {
		@apply bg-blue-400 border-blue-300 text-white;
	}
</style>
