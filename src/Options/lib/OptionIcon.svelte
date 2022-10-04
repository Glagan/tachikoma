<script lang="ts">
	import type { SvelteComponentTyped } from "svelte";
	import { file } from "@Core/Utility";

	export let icon: typeof SvelteComponentTyped<{ size?: string; class?: string }> | string;
	const isFile = typeof icon === "string" && icon.startsWith("file:");
	const fileUrl = typeof icon === "string" ? file(icon.slice(5)) : "";
</script>

{#if isFile}
	<img src={fileUrl} alt={`Option icon`} class="inline-block mr-2" />
{:else if typeof icon === "string"}
	<img src={icon} alt={`Option icon`} class="inline-block mr-2" />
{:else}
	<svelte:component this={icon} size="20" class="inline mr-2" />
{/if}
