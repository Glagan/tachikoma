<script lang="ts">
	import { file } from "@Core/Utility";

	export let src: string;
	const isFile = src.startsWith("file:");
	const fileUrl = file(src.slice(5));
</script>

{#if isFile}
	<img src={fileUrl} alt={`Option icon`} class="inline-block mr-2" />
{:else}
	<i class={`${src} text-lg mr-2`} />
{/if}
