<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { ExternalLinkIcon, LoaderIcon } from "svelte-feather-icons";
	import Modal from "@Components/Modal.svelte";
	import Button from "@Components/Button.svelte";
	import type { SearchResult, SearchTitle } from "@Core/Service";
	import { file } from "@Core/Utility";
	import { Options } from "@Core/Options";
	import { Lake } from "@Core/Lake";
	import { crossfade, fade } from "svelte/transition";
	import { quintOut } from "svelte/easing";
	import { temporaryTitleStore } from "./TemporaryTitle";

	let modal: Modal;
	let closable: boolean = true;

	export function show() {
		modal.show();
	}

	const dispatch = createEventDispatcher<{ hide: void }>();
	export function hide() {
		modal.hide();
		dispatch("hide");
	}

	let query: string = $temporaryTitleStore.name ?? "";
	let loading: { [key: string]: boolean } = {};
	let results: { [key: string]: SearchResult | SearchTitle[] } = {};

	export function cleanup() {
		loading = {};
		results = {};
	}

	const searchableServices = Lake.services.filter((service) => Options.hasService(service.key) && service.search);
	async function doSearch() {
		if (query.length < 2) return;
		closable = false;
		let promises = [];
		for (const service of searchableServices) {
			loading[service.key] = true;
			loading = loading;
			promises.push(
				service.search!(query).then((result) => {
					results[service.key] = result;
					delete loading[service.key];
					results = results;
					loading = loading;
				})
			);
		}
		await Promise.all(promises);
		closable = true;
	}
	$: servicesWithResult = searchableServices.filter((service) => loading[service.key] || results[service.key]);

	function resultsAsError(results: SearchResult | SearchTitle[]): SearchResult {
		return results as SearchResult;
	}

	function resultAsArray(results: SearchResult | SearchTitle[]): SearchTitle[] {
		return results as SearchTitle[];
	}

	// ? currentIdentifier is added to make the function result reactive
	function isUsingIdentifier(identifier: TitleIdentifier, currentIdentifier: TitleIdentifier | undefined) {
		return (
			currentIdentifier &&
			Object.keys(currentIdentifier).length > 0 &&
			Object.keys(currentIdentifier).every((key) => identifier[key] == currentIdentifier[key])
		);
	}

	const [send, receive] = crossfade({
		duration: 250,
		easing: quintOut,
	});
</script>

<Modal bind:this={modal} {closable}>
	<svelte:fragment slot="header">Service Search</svelte:fragment>
	<div slot="body">
		<div
			class="flex p-4"
			class:items-start={$temporaryTitleStore.thumbnail}
			class:items-center={!$temporaryTitleStore.thumbnail}
		>
			<div class="flex-shrink-0 w-1/5 mr-4 text-center">
				{#if $temporaryTitleStore.thumbnail}
					<img
						src={$temporaryTitleStore.thumbnail}
						alt={`${$temporaryTitleStore.name} thumbnail`}
						class="max-h-32 rounded-md drop-shadow-md mx-auto"
					/>
				{:else}
					<div>No Thumbnail</div>
				{/if}
			</div>
			<div class="flex-grow flex-shrink">
				{#if $temporaryTitleStore.name}
					<div>Searching for: <b>{$temporaryTitleStore.name}</b></div>
				{/if}
				<form class="flex items-center" on:submit|preventDefault={doSearch}>
					<input
						id="name"
						class="input flex-grow mr-4"
						type="text"
						disabled={!closable}
						placeholder="Name"
						bind:value={query}
					/>
					<Button class="flex-shrink-0" disabled={!closable || query.length < 2}>Search</Button>
				</form>
			</div>
		</div>
		{#each servicesWithResult as service (service.key)}
			<div class="title-separator flex items-center border-b">
				<img src={file(`/static/icons/${service.key}.png`)} alt={`${service.name} icon`} class="mr-2" />
				{service.name}
			</div>
			<div class="p-4">
				{#if loading[service.key]}
					<div
						in:send={{ key: service.key }}
						out:receive={{ key: service.key }}
						class="flex justify-center items-center"
					>
						<LoaderIcon size="20" class="mr-2" />
						Loading...
					</div>
				{:else if results[service.key]}
					{#if !Array.isArray(results[service.key])}
						{@const result = resultsAsError(results[service.key])}
						<div class="text-center" in:send={{ key: service.key }} out:receive={{ key: service.key }}>
							Error in search ({result.status}): {result.message ? result.message : "no error message"}
						</div>
					{:else}
						<div
							class="flex flex-row flex-nowrap overflow-y-auto"
							in:send={{ key: service.key }}
							out:receive={{ key: service.key }}
						>
							{#each resultAsArray(results[service.key]) as result}
								{@const used = isUsingIdentifier(
									result.identifier,
									$temporaryTitleStore.relations[service.key]
								)}
								<div class="flex-1 text-center min-w-[125px]" title={result.name} transition:fade>
									{#if result.thumbnail}
										{#if service.link}
											<a
												href={service.link(result.identifier)}
												target="_blank"
												rel="noreferrer noopener"
												title="Click to open"
											>
												<img
													src={result.thumbnail}
													alt={`${result.name} thumbnail`}
													class="max-h-32 rounded-md drop-shadow-md mx-auto"
												/>
											</a>
										{:else}
											<img
												src={result.thumbnail}
												alt={`${result.name} thumbnail`}
												class="max-h-32 rounded-md drop-shadow-md mx-auto"
											/>
										{/if}
									{:else}
										<div>
											No Thumbnail
											{#if service.link}
												<a
													href={service.link(result.identifier)}
													target="_blank"
													rel="noreferrer noopener"
												>
													<ExternalLinkIcon size="20" />
												</a>
											{/if}
										</div>
									{/if}
									<Button
										type={used ? "loading" : "info"}
										size="sm"
										disabled={used}
										class="mt-2"
										on:click={() => {
											if (!used) {
												temporaryTitleStore.useService(service.key, result.identifier);
											}
										}}
									>
										{#if used}
											In use
										{:else}
											Use
										{/if}
									</Button>
								</div>
							{:else}
								<div
									class="text-center"
									in:send={{ key: service.key }}
									out:receive={{ key: service.key }}
								>
									No results
								</div>
							{/each}
						</div>
					{/if}
				{:else}
					<div class="text-center" in:send={{ key: service.key }} out:receive={{ key: service.key }}>
						Failed to search on {service.name}
					</div>
				{/if}
			</div>
		{/each}
	</div>
	<div slot="footer" class="flex justify-end w-full">
		<Button type="warning" disabled={!closable} on:click={hide}>Close</Button>
	</div>
</Modal>

<style lang="postcss">
	.title-separator {
		@apply sticky top-0 z-10 p-2 border-tachikoma-600 text-2xl bg-tachikoma-800;
	}
</style>
