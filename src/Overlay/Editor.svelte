<script lang="ts">
	import { DateTime } from "luxon";
	import type Title from "@Core/Title";
	import Modal from "@Components/Modal.svelte";
	import Button from "@Components/Button.svelte";
	import { Lake } from "@Core/Lake";
	import { deepAssign } from "@Core/Utility";
	import Badge from "@Components/Badge.svelte";
	import { Status, statusToString, TitleInterface } from "@Core/Title";
	import Toggle from "@Components/Toggle.svelte";
	import DateSelector from "./DateSelector.svelte";
	import ServiceEditor from "./ServiceEditor.svelte";
	import { Score } from "@Core/Score";
	import Tachikoma from "@Core/Tachikoma";
	import { debug } from "@Core/Logger";
	import { createEventDispatcher } from "svelte";

	export let title: Title;

	let closable = true;
	let modal: Modal;

	export function show() {
		modal.show();
	}

	const dispatch = createEventDispatcher<{ hide: void }>();

	export function hide() {
		modal.hide();
		dispatch("hide");
	}

	let name = title?.name;
	let thumbnail = title?.thumbnail;
	let chapter = title?.chapter != undefined ? `${title.chapter}` : "";
	let volume = title?.volume != undefined ? `${title.volume}` : "";
	let status = title?.status;
	let score = title?.score ? `${title.score.get([0, 100])}` : "";

	const statusList = Object.keys(Status)
		.map((key) => parseInt(key))
		.filter((key) => !isNaN(key))
		.map((key) => key as Status);

	let startDateSelector: DateSelector;
	let startDate: DateTime | undefined = title?.startDate?.set({});
	let endDateSelector: DateSelector;
	let endDate: DateTime | undefined = title?.endDate?.set({});

	const lockedServices = Array.from(title.lockedServices);
	const services: typeof title.services = deepAssign({}, title.services);
	for (const service of Lake.services) {
		if (!services[service.key]) {
			services[service.key] = {};
		}
	}

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
		const validServices: typeof title.services = {};
		for (const key of Object.keys(services)) {
			if (Object.keys(services[key]).length > 0) {
				validServices[key] = services[key];
			}
		}
		const title: TitleInterface = {
			name,
			thumbnail,
			chapter: intChapter,
			volume: isNaN(intVolume) ? undefined : intVolume,
			status,
			score: score == undefined || score == "" || isNaN(intScore) ? undefined : new Score(intScore, [0, 100]),
			startDate,
			endDate,
			lockedServices,
			services: validServices,
		};
		debug("Updating title to", JSON.parse(JSON.stringify(title)));
		await Tachikoma.update(title, deletePrevious, updateExternals);
		closable = true;
		hide();
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
					<i class="light-icon-dots text-lg mr-2" /> Name
				</label>
				<input id="name" class="input" type="text" disabled={!closable} placeholder="Name" bind:value={name} />
				<label for="thumbnail" class="label">
					<i class="light-icon-photo text-lg mr-2" /> Thumbnail
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
					<i class="light-icon-bookmark text-lg mr-2" /> Chapter
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
					<i class="light-icon-notebook text-lg mr-2" /> Volume
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
					<i class="light-icon-cloud text-lg mr-2" /> Status
				</label>
				<select name="status" class="select" disabled={!closable} bind:value={status}>
					{#each statusList as status}
						<option value={status}>{statusToString(status)}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="score" class="label">
					<i class="light-icon-star text-lg mr-2" /> Score
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
					<div><i class="light-icon-calendar-plus text-lg mr-2" /> Started</div>
					<Badge type="info" class="cursor-pointer" on:click={() => startDateSelector.setTo(DateTime.now())}>
						Today
					</Badge>
				</div>
				<DateSelector bind:this={startDateSelector} disabled={!closable} bind:date={startDate} />
			</div>
			<div>
				<div class="label flex justify-between">
					<div><i class="light-icon-calendar-event text-lg mr-2" /> Completed</div>
					<Badge type="info" class="cursor-pointer" on:click={() => endDateSelector.setTo(DateTime.now())}>
						Today
					</Badge>
				</div>
				<DateSelector bind:this={endDateSelector} disabled={!closable} bind:date={endDate} />
			</div>
		</div>
		<div class="title-separator border-y">Services</div>
		<div class="p-4">
			{#each Lake.services as service (service.key)}
				<ServiceEditor {service} {lockedServices} disabled={!closable} identifier={services[service.key]} />
			{/each}
		</div>
	</div>
	<div slot="footer" class="flex justify-between w-full">
		<div>
			<div class="flex items-center justify-start">
				<label for="update-external" class="text-sm cursor-pointer mr-2">Update all Services</label>
				<Toggle key="update-external" bind:value={updateExternals} showLabel={false} />
			</div>
			<div class="flex items-center justify-start">
				<label for="delete-previous" class="text-sm cursor-pointer mr-2">Delete previous services</label>
				<Toggle key="delete-previous" bind:value={deletePrevious} showLabel={false} />
			</div>
		</div>
		<div class="flex items-center">
			<Button type="success" disabled={!closable || !valid} class="mr-2 transition-all" on:click={save}>
				<span>Save</span>
				<i class="light-icon-upload text-lg ml-2" />
			</Button>
			<Button type="warning" disabled={!closable} on:click={hide}>Close</Button>
		</div>
	</div>
</Modal>

<style lang="postcss">
	.title-separator {
		@apply sticky top-0 z-10 p-2 border-tachikoma-600 text-2xl bg-tachikoma-800;
	}
</style>
