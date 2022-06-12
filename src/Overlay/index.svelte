<script lang="ts">
	import { fade } from "svelte/transition";
	import type Title from "@Core/Title";
	import Button from "../Components/Button.svelte";

	export let title: Title;
</script>

<div class="title" transition:fade>
	<img
		src="https://mangadex.org/covers/038740e2-13e5-4e5c-a774-405cf9419b51/0478b446-a593-44b4-add5-a7c77bd30bcd.png.512.jpg"
		alt="Cover"
		style="max-height: 150px;"
	/>
	<div class="p-1 flex-grow flex-shrink overflow-hidden">
		<div class="truncate overflow-hidden" title="Title">Title</div>
		<div>{title}</div>
		<div>X/Y V/W</div>
	</div>
	<div class="p-1 flex  flex-col justify-between flex-shrink-0">
		<Button type="info" size="sm">
			<i class="light-icon-refresh text-lg" />
		</Button>
		<Button type="info" size="sm">
			<i class="light-icon-refresh text-lg" />
		</Button>
	</div>
</div>

<style lang="postcss">
	.title {
		@apply absolute bottom-4 right-4 z-50 flex flex-row bg-blue-50 text-black rounded-sm overflow-hidden;
		width: 300px;
		height: 150px;
	}
</style>
