<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { DateTime } from "luxon";
	import {
		HashIcon,
		ImageIcon,
		BookmarkIcon,
		BookIcon,
		CloudIcon,
		StarIcon,
		CalendarIcon,
		SaveIcon,
	} from "svelte-feather-icons";
	import type Title from "@Core/Title";
	import Modal from "@Components/Modal.svelte";
	import Button from "@Components/Button.svelte";
	import Badge from "@Components/Badge.svelte";
	import { Status, statusToString, type TitleInterface } from "@Core/Title";
	import Toggle from "@Components/Toggle.svelte";
	import DateSelector from "./DateSelector.svelte";
	import RelationEditor from "./RelationEditor.svelte";
	import { Score } from "@Core/Score";
	import Tachikoma from "@Core/Tachikoma";
	import { debug } from "@Core/Logger";
	import Search from "./Search.svelte";
	import { temporaryTitleStore } from "./TemporaryTitle";
	import Relations from "@Core/Relations";

	export let title: Title;
	temporaryTitleStore.setFrom(title);

	let closable = true;
	let modal: Modal;
	let searchModal: Search;

	export function show() {
		searchModal.cleanup();
		modal.show();
	}

	const dispatch = createEventDispatcher<{ hide: void }>();

	export function hide() {
		modal.hide();
		dispatch("hide");
	}

	let name = $temporaryTitleStore.name;
	let thumbnail = $temporaryTitleStore.thumbnail;
	let chapter = $temporaryTitleStore.chapter != undefined ? `${$temporaryTitleStore.chapter}` : "";
	let volume = $temporaryTitleStore.volume != undefined ? `${$temporaryTitleStore.volume}` : "";
	let status = $temporaryTitleStore.status;
	let score = $temporaryTitleStore.score ? `${$temporaryTitleStore.score.get([0, 100])}` : "";

	const statusList = Object.keys(Status)
		.map((key) => parseInt(key))
		.filter((key) => !isNaN(key))
		.map((key) => key as Status);

	let startDateSelector: DateSelector;
	let endDateSelector: DateSelector;

	$: intChapter = parseInt(chapter);
	$: validChapter = chapter != undefined && !isNaN(intChapter) && intChapter >= 0;
	$: intVolume = parseInt(volume);
	$: validVolume = volume == undefined || volume == "" || (!isNaN(intVolume) && intVolume >= 0);
	$: intScore = parseInt(score);
	$: validScore = score == undefined || score == "" || (!isNaN(intScore) && intScore > 0 && intScore <= 100);
	$: valid = name != undefined && name.length > 0 && validChapter && validVolume && status != undefined && validScore;

	let updateExternals = true;
	let deletePrevious = true;

	async function save() {
		closable = false;
		const validRelations: typeof $temporaryTitleStore.relations = {};
		for (const relationKey of Object.keys($temporaryTitleStore.tmpIdentifiers)) {
			if ($temporaryTitleStore.tmpIdentifiers[relationKey].length > 0) {
				validRelations[relationKey] = {};
				for (const { key, value } of $temporaryTitleStore.tmpIdentifiers[relationKey]) {
					validRelations[relationKey][key] = value;
				}
			}
		}
		const title: TitleInterface = {
			name,
			thumbnail,
			chapter: intChapter,
			volume: isNaN(intVolume) ? undefined : intVolume,
			status,
			score: score == undefined || score == "" || isNaN(intScore) ? undefined : new Score(intScore, [0, 100]),
			startDate: $temporaryTitleStore.startDate,
			endDate: $temporaryTitleStore.endDate,
			lockedRelations: $temporaryTitleStore.lockedRelations,
			relations: validRelations,
		};
		debug("Updating title to", JSON.parse(JSON.stringify(title)), deletePrevious, updateExternals);
		await Tachikoma.update(title, deletePrevious, updateExternals);
		closable = true;
		hide();
	}

	function showSearch() {
		searchModal.show();
	}
</script>

<Modal bind:this={modal} bind:closable>
	<svelte:fragment slot="header">
		{#if name}
			{name}
		{:else}
			Title Editor
		{/if}
	</svelte:fragment>
	<div slot="body">
		<div class="title-separator border-b">Informations</div>
		<div class="flex p-4 pb-0" class:items-start={thumbnail} class:items-center={!thumbnail}>
			<div class="flex-shrink-0 w-1/3 mr-4 text-center">
				{#if thumbnail}
					<img src={thumbnail} alt={`${name} thumbnail`} class="max-h-64 rounded-md drop-shadow-md mx-auto" />
				{:else}
					<div>No Thumbnail</div>
				{/if}
			</div>
			<div class="flex-grow flex-shrink">
				<label for="name" class="label mt-0">
					<HashIcon class="mr-2" /> Name
				</label>
				<input id="name" class="input" type="text" disabled={!closable} placeholder="Name" bind:value={name} />
				<label for="thumbnail" class="label">
					<ImageIcon class="mr-2" /> Thumbnail
				</label>
				<input
					id="thumbnail"
					class="input"
					type="text"
					disabled={!closable}
					placeholder="Thumbnail"
					bind:value={thumbnail}
				/>
			</div>
		</div>
		<div class="grid grid-cols-2 gap-4 p-4 pt-0">
			<div>
				<label for="chapter" class="label">
					<BookmarkIcon size="20" class="mr-2" /> Chapter
				</label>
				<div class="flex items-center">
					<input
						id="chapter"
						class="input mr-2"
						type="text"
						disabled={!closable}
						placeholder="Chapter"
						bind:value={chapter}
					/>
					<span class="flex-shrink-0"> / ?</span>
				</div>
			</div>
			<div>
				<label for="volume" class="label">
					<BookIcon size="20" class="mr-2" /> Volume
				</label>
				<div class="flex items-center">
					<input
						id="volume"
						class="input mr-2"
						type="text"
						disabled={!closable}
						placeholder="Volume"
						bind:value={volume}
					/>
					<span class="flex-shrink-0"> / ?</span>
				</div>
			</div>
			<div>
				<label for="status" class="label">
					<CloudIcon size="20" class="mr-2" /> Status
				</label>
				<select name="status" class="select" disabled={!closable} bind:value={status}>
					{#each statusList as status}
						<option value={status}>{statusToString(status)}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="score" class="label">
					<StarIcon size="20" class="mr-2" /> Score
				</label>
				<div class="flex items-center">
					<input
						id="score"
						class="input mr-2"
						type="text"
						disabled={!closable}
						placeholder="Score"
						bind:value={score}
					/>
					<span class="flex-shrink-0"> / 100</span>
				</div>
			</div>
			<div>
				<div class="label flex justify-between">
					<div><CalendarIcon size="20" class="inline mr-2" />Started</div>
					<Badge type="info" class="cursor-pointer" on:click={() => startDateSelector.setTo(DateTime.now())}>
						Today
					</Badge>
				</div>
				<DateSelector
					bind:this={startDateSelector}
					disabled={!closable}
					bind:date={$temporaryTitleStore.startDate}
				/>
			</div>
			<div>
				<div class="label flex justify-between">
					<div><CalendarIcon size="20" class="inline mr-2" />Completed</div>
					<Badge type="info" class="cursor-pointer" on:click={() => endDateSelector.setTo(DateTime.now())}>
						Today
					</Badge>
				</div>
				<DateSelector
					bind:this={endDateSelector}
					disabled={!closable}
					bind:date={$temporaryTitleStore.endDate}
				/>
			</div>
		</div>
		<div class="flex justify-between items-center title-separator border-y">
			Relations
			<Button size="sm" on:click={showSearch}>Search</Button>
		</div>
		<div class="p-4">
			{#each Relations as relationKey}
				<RelationEditor {relationKey} disabled={!closable} />
			{/each}
		</div>
	</div>
	<div slot="footer" class="flex justify-between w-full">
		<div>
			<div class="flex items-center justify-start">
				<label for="delete-previous" class="text-sm cursor-pointer mr-2">Delete previous services</label>
				<Toggle key="delete-previous" bind:value={deletePrevious} disabled showLabel={false} />
			</div>
			<div class="flex items-center justify-start">
				<label for="update-external" class="text-sm cursor-pointer mr-2">Update all Services</label>
				<Toggle key="update-external" bind:value={updateExternals} disabled showLabel={false} />
			</div>
		</div>
		<div class="flex items-center">
			<Button type="success" disabled={!closable || !valid} class="mr-2 transition-all" on:click={save}>
				<span>Save</span>
				<SaveIcon class="ml-2" />
			</Button>
			<Button type="warning" disabled={!closable} on:click={hide}>Close</Button>
		</div>
	</div>
</Modal>
<Search bind:this={searchModal} />

<style lang="postcss">
	.title-separator {
		@apply sticky top-0 z-10 p-2 border-tachikoma-600 text-2xl bg-tachikoma-800;
	}
</style>
