<script lang="ts">
	import { fade, crossfade } from "svelte/transition";
	import { quintOut } from "svelte/easing";
	import type Title from "@Core/Title";
	import { icons } from "@Overlay";
	import Button from "@Components/Button.svelte";
	import { Status, statusToString } from "@Core/Title";
	import Badge from "@Components/Badge.svelte";

	export let loading: boolean = false;
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
		}, 100);
	}

	const key = Symbol();
	const [send, receive] = crossfade({
		duration: 250,
		easing: quintOut,
	});
</script>

<div id="tkma" on:mouseenter={onMouseEnter} on:mouseleave={onMouseLeave}>
	{#if title}
		<div class="overlay-wrapper" in:send={{ key }} out:receive={{ key }}>
			{#if loading}
				<div class="loader" in:fade />
			{/if}
			<div class="overlay title">
				{#if cover}
					<img src={cover} alt={`${title.name} cover`} style="max-height: 150px;" />
				{/if}
				<div class="p-1 flex-grow flex-shrink overflow-hidden">
					<div class="truncate overflow-hidden" title={title.name}>{title.name}</div>
					<div class="text-center"><Badge type="info">{statusToString(title.status)}</Badge></div>
					<div>
						<p class="flex items-center">
							{#if title.chapter}
								<i class="light-icon-bookmark" /> Chapter {title.chapter}
							{:else}
								No chapter
							{/if}
						</p>
						{#if title.volume}
							<p class="flex items-center">
								<i class="light-icon-notebook" /> Volume {title.volume}
							</p>
						{/if}
						{#if title.startDate}
							<p class="flex items-center">
								<i class="light-icon-calendar-plus" /> Start Date {title.startDate.toLocaleString()}
							</p>
						{/if}
						{#if title.endDate}
							<p class="flex items-center">
								<i class="light-icon-calendar-event" /> End Date {title.endDate.toLocaleString()}
							</p>
						{/if}
					</div>
				</div>
				<div class="p-1 flex  flex-col justify-between flex-shrink-0">
					<Button type="info" size="xs">
						<i class="light-icon-edit text-lg" />
					</Button>
					<Button type="info" size="xs">
						<i class="light-icon-refresh text-lg" />
					</Button>
				</div>
			</div>
		</div>
	{:else}
		<div class="overlay-wrapper" in:send={{ key }} out:receive={{ key }}>
			{#if loading}
				<div class="loader" in:fade />
			{/if}
			<div class="overlay opener">
				<img src={title ? icons.loading : icons.inactive} alt="tachikoma" />
			</div>
		</div>
	{/if}
</div>

<style lang="postcss">
	@keyframes move-background {
		50% {
			background-position: 100% 50%;
		}
	}
	.overlay-wrapper {
		@apply fixed bottom-4 right-4 z-50 rounded-md overflow-hidden flex items-center justify-center;
		padding: 2px;
	}
	.loader {
		@apply w-full h-full absolute;
		background: rgb(255, 182, 28);
		background: linear-gradient(90deg, rgba(255, 182, 28, 1) 0%, rgba(107, 139, 176, 1) 100%);
		background-size: 300% 300%;
		background-position: 0 50%;
		animation: move-background 1s alternate infinite;
	}
	.overlay {
		@apply w-full h-full rounded-md relative overflow-hidden;
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
