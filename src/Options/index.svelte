<script lang="ts">
	import { zapOptions, ZapContainer } from "@glagan/zap";
	import Services from "./lib/Services.svelte";
	import Options from "./lib/Options.svelte";
	import { loading, optionsStore } from "./stores/Options";

	zapOptions.setDefault({ position: "bottom-center" });
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
			<Options />
		</div>
	{/if}
	<div class="pt-4" />

	<ZapContainer />
</main>
