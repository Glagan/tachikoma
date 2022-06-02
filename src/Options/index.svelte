<script lang="ts">
	import Counter from "./lib/Counter.svelte";

	let loading = true;
</script>

<main>
	{#if loading}
		<div class="spinner-grow inline-block w-12 h-12 bg-current rounded-full opacity-0" role="status">
			<span class="visually-hidden">Loading...</span>
		</div>
	{:else}
		<div class="body">
			<!-- <Services :loading="loading" /> -->
		</div>
	{/if}
	<div class="pt-4" />
</main>

<style>
</style>
