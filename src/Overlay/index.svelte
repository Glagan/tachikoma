<script lang="ts">
	import { crossfade, fade, scale } from "svelte/transition";
	import { quintOut } from "svelte/easing";
	import type Title from "@Core/Title";
	import Button from "@Components/Button.svelte";

	export let title: Title | undefined;
	let hovered = false;

	let hoverTimeout = 0;
	function onMouseEnter() {
		clearTimeout(hoverTimeout);
		if (title) {
			hovered = true;
		}
	}

	function onMouseLeave() {
		/// @ts-expect-error setTimeout type is for the browser *not* NodeJS
		hoverTimeout = setTimeout(() => {
			hovered = false;
		}, 300);
	}

	const key = Symbol();
	const [send, receive] = crossfade({
		duration: 1500,
		easing: quintOut,
	});
</script>

<div id="tkma" on:mouseenter={onMouseEnter} on:mouseleave={onMouseLeave}>
	{#if title && hovered}
		<div class="overlay title" in:send={{ key, duration: 200 }} out:receive={{ key, duration: 200 }}>
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
		hoverTimeout
	{:else}
		<div class="overlay opener" in:send={{ key, duration: 200 }} out:receive={{ key, duration: 200 }}>
			{#if title}
				<img src="https://tachikoma.app/loading_64.png" alt="tachikoma" />
			{:else}
				<img src="https://tachikoma.app/sleepy_64.png" alt="tachikoma" />
			{/if}
		</div>
	{/if}
</div>

<style lang="postcss">
	.overlay {
		@apply fixed bottom-4 right-4 z-50 overflow-hidden;
	}
	.title {
		@apply flex flex-row bg-blue-50 text-black rounded-sm;
		width: 300px;
		height: 150px;
	}
	.opener {
		@apply border-tachikoma-50 bg-tachikoma-600 text-tachikoma-50 rounded-md;
	}
</style>
