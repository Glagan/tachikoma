<script lang="ts">
	import { fade, crossfade } from "svelte/transition";
	import { quintOut } from "svelte/easing";
	import { ZapContainer } from "@glagan/zap";
	import type Title from "@Core/Title";
	import { icons } from "@Overlay";
	import Button from "@Components/Button.svelte";
	import { statusToColor, statusToString } from "@Core/Title";
	import Badge, { type BadgeType } from "@Components/Badge.svelte";
	import { file } from "@Core/Utility";
	import { Lake } from "@Core/Lake";
	import { Options } from "@Core/Options";
	import Editor from "./Editor.svelte";
	import { tick } from "svelte";

	export let loading: boolean = false;
	export let title: Title | undefined = undefined;
	export let cover: string | undefined = undefined;
	let opened = false;

	let hoverTimeout: ReturnType<typeof setTimeout>;
	function onMouseEnter() {
		if (!Options.values.overlay.openOnClick) {
			clearTimeout(hoverTimeout);
			if (title) {
				opened = true;
			}
		}
	}

	function onMouseLeave() {
		if (!Options.values.overlay.openOnClick) {
			hoverTimeout = setTimeout(() => {
				opened = false;
			}, 250);
		}
	}

	function toggleOverlay() {
		if (Options.values.overlay.openOnClick) {
			opened = !opened;
		}
	}

	const key = Symbol();
	const [send, receive] = crossfade({
		duration: 250,
		easing: quintOut,
	});

	$: badgeType = title ? (statusToColor(title.status) as BadgeType) : "loading";
	$: activeServices = title ? Object.keys(title.services).filter((key) => Options.hasService(key)) : undefined;

	let editor: Editor;
	let editorVisible = false;

	function showEditor() {
		editorVisible = true;
		tick().then(() => {
			editor?.show();
		});
	}
</script>

<div id="tkma">
	<div on:mouseenter={onMouseEnter} on:mouseleave={onMouseLeave}>
		{#if title && opened}
			<div class="overlay-wrapper" in:send={{ key }} out:receive={{ key }}>
				{#if loading}
					<div class="loader" in:fade />
				{/if}
				{#if activeServices}
					<div class="absolute top-0 left-[4px] right-0 -translate-y-[28px]">
						{#each activeServices as serviceKey}
							{@const service = Lake.map[serviceKey]}
							<div class="service-quick-view" title={service.name}>
								<img
									class="inline-block"
									src={file(`/static/icons/${serviceKey}.png`)}
									alt={service.name}
								/>
							</div>
						{/each}
					</div>
				{/if}
				<div class="overlay title" on:click={toggleOverlay}>
					{#if cover}
						<img
							src={cover}
							alt={`${title.name} cover`}
							height="150"
							width="112"
							class="border-r border-tachikoma-50"
							style="max-height: 150px;max-width: 112px;"
						/>
					{/if}
					<div class="p-1 flex-grow flex-shrink overflow-hidden">
						<div class="truncate overflow-hidden font-bold" title={title.name}>{title.name}</div>
						<div class="text-center my-1">
							<Badge type={badgeType}>{statusToString(title.status)}</Badge>
						</div>
						<div>
							{#if title.chapter}
								<p class="flex items-center">
									<i class="light-icon-bookmark mr-2" /> Chapter {title.chapter}
								</p>
							{/if}
							{#if title.volume}
								<p class="flex items-center">
									<i class="light-icon-notebook mr-2" /> Volume {title.volume}
								</p>
							{/if}
							{#if title.startDate}
								<p class="flex items-center">
									<i class="light-icon-calendar-plus mr-2" /> Started {title.startDate.toLocaleString()}
								</p>
							{/if}
							{#if title.endDate}
								<p class="flex items-center">
									<i class="light-icon-calendar-event mr-2" /> Completed {title.endDate.toLocaleString()}
								</p>
							{/if}
						</div>
					</div>
					<div class="p-1 flex  flex-col justify-between flex-shrink-0">
						<Button type="info" size="xs" title="Open Title editor" on:click={showEditor}>
							<i class="light-icon-edit text-lg" />
						</Button>
						<Button type="info" size="xs" disabled>
							<i class="light-icon-refresh text-lg" />
						</Button>
					</div>
				</div>
			</div>
		{:else}
			<div class="overlay-wrapper cursor-pointer" in:send={{ key }} out:receive={{ key }}>
				{#if loading}
					<div class="loader" in:fade />
				{/if}
				<div class="overlay opener" on:click={toggleOverlay}>
					<img src={title ? icons.loading : icons.inactive} alt="tachikoma" />
				</div>
			</div>
		{/if}
	</div>
	{#if title && editorVisible}
		<Editor bind:this={editor} {title} on:hide={() => (editorVisible = false)} />
	{/if}
	<ZapContainer />
</div>

<style lang="postcss">
	@keyframes move-background {
		50% {
			background-position: 100% 50%;
		}
	}
	.overlay-wrapper {
		@apply fixed bottom-4 right-4 z-50 rounded-md flex items-center justify-center;
		padding: 2px;
	}
	.loader {
		@apply w-full h-full absolute rounded-md;
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
	.service-quick-view {
		@apply inline-block rounded-full border border-tachikoma-50 bg-tachikoma-600 mr-2 px-1;
	}
</style>
