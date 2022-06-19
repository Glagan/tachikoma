<script lang="ts">
	import { crossfade } from "svelte/transition";
	import { quintOut } from "svelte/easing";
	import type Title from "@Core/Title";
	import { icons } from "@Overlay";
	import Button from "@Components/Button.svelte";
	import { Status, statusToString } from "@Core/Title";
	import Badge from "@Components/Badge.svelte";

	export let title: Title | undefined;
	export let cover: string | undefined;
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
			{#if cover}
				<img src={cover} alt={`${title.name} cover`} style="max-height: 150px;" />
			{/if}
			<div class="p-1 flex-grow flex-shrink overflow-hidden">
				<div class="truncate overflow-hidden" title={title.name}>{title.name}</div>
				{#if title.status !== Status.NONE}
					<div><Badge type="info">{statusToString(title.status)}</Badge></div>
					<div>
						{#if title.chapter} {title.chapter} {:else} No chapter {/if}
						{#if title.volume} {title.volume} {/if}
					</div>
				{:else}
					<div><Badge type="info">Not in list</Badge></div>
				{/if}
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
			<img src={title ? icons.loading : icons.inactive} alt="tachikoma" />
		</div>
	{/if}
</div>

<style lang="postcss">
	.overlay {
		@apply fixed bottom-4 right-4 z-50 rounded-md overflow-hidden;
	}
	.title {
		@apply flex flex-row border border-tachikoma-50 bg-tachikoma-600 text-tachikoma-100;
		width: 400px;
		height: 150px;
	}
	.opener {
		@apply border border-tachikoma-50 bg-tachikoma-600 text-tachikoma-100;
	}
</style>
