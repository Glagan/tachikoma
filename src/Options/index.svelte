<script lang="ts">
	import Services from "./lib/Services.svelte";
	import Options from "./lib/Options.svelte";
	import { loading, optionsStore } from "./stores/Options";
	import { toasts } from "./stores/Toasts";
	import Toast from "./lib/Toast.svelte";

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

	<div class="absolute bottom-1 left-1/2 -translate-x-1/2">
		{#each $toasts as toast (toast.id)}
			<Toast {toast} />
		{/each}
	</div>
</main>
