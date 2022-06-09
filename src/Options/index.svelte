<script lang="ts">
	import Services from "./lib/Services.svelte";
	import { loading, optionsStore } from "./stores/Options";

	optionsStore.load();
</script>

<main>
	{#if $loading}
		<div class="spinner-grow inline-block w-12 h-12 bg-current rounded-full opacity-0" role="status">
			<span class="visually-hidden">Loading...</span>
		</div>
	{:else}
		<div class="body">
			<Services />
		</div>
	{/if}
	<div class="pt-4" />
</main>

<style>
</style>
