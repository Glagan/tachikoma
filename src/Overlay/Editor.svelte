<script lang="ts">
	import type Title from "@Core/Title";
	import Modal from "@Components/Modal.svelte";
	import Button from "@Components/Button.svelte";
	import { Lake } from "@Core/Lake";
	import { file } from "@Core/Utility";
	import Toggle from "@Components/Toggle.svelte";
	import Badge from "@Components/Badge.svelte";
	import { Status, statusToString } from "@Core/Title";
	import DateSelector from "./DateSelector.svelte";
	import { DateTime } from "luxon";

	export let title: Title;

	let closable = true;
	let modal: Modal;

	export function show() {
		modal.show();
	}

	export function hide() {
		modal.hide();
	}

	function save() {
		// TODO
	}

	let name = title?.name;
	let thumbnail = title?.thumbnail;
	let chapter = title?.chapter;
	let volume = title?.volume;
	let status = title?.status;
	let score = title?.score;

	const statusList = Object.keys(Status)
		.map((key) => parseInt(key))
		.filter((key) => !isNaN(key))
		.map((key) => key as Status);

	let startDateSelector: DateSelector;
	let startDate: DateTime | undefined = title?.startDate?.set({});
	let endDateSelector: DateSelector;
	let endDate: DateTime | undefined = title?.endDate?.set({});
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
				<input id="name" class="input" type="text" placeholder="Name" bind:value={name} />
				<label for="thumbnail" class="label">
					<i class="light-icon-photo text-lg mr-2" /> Thumbnail
				</label>
				<input id="thumbnail" class="input" type="text" placeholder="Thumbnail" bind:value={thumbnail} />
			</div>
		</div>
		<div class="grid grid-cols-2 gap-4 p-4 pt-0">
			<div>
				<label for="chapter" class="label">
					<i class="light-icon-bookmark text-lg mr-2" /> Chapter
				</label>
				<div class="flex items-center">
					<input id="chapter" class="input mr-2" type="text" placeholder="Chapter" bind:value={chapter} />
					<span class="flex-shrink-0">/ ?</span>
				</div>
			</div>
			<div>
				<label for="volume" class="label">
					<i class="light-icon-notebook text-lg mr-2" /> Volume
				</label>
				<div class="flex items-center">
					<input id="volume" class="input mr-2" type="text" placeholder="Volume" bind:value={volume} />
					<span class="flex-shrink-0">/ ?</span>
				</div>
			</div>
			<div>
				<label for="status" class="label">
					<i class="light-icon-cloud text-lg mr-2" /> Status
				</label>
				<select name="status" class="select" bind:value={status}>
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
					<input id="score" class="input mr-2" type="text" placeholder="Score" bind:value={score} />
					<span class="flex-shrink-0">/ 10</span>
				</div>
			</div>
			<div>
				<div class="label flex justify-between">
					<div><i class="light-icon-calendar-plus text-lg mr-2" /> Started</div>
					<Badge type="info" class="cursor-pointer" on:click={() => startDateSelector.setTo(DateTime.now())}>
						Today
					</Badge>
				</div>
				<DateSelector bind:this={startDateSelector} bind:date={startDate} />
			</div>
			<div>
				<div class="label flex justify-between">
					<div><i class="light-icon-calendar-event text-lg mr-2" /> Completed</div>
					<Badge type="info" class="cursor-pointer" on:click={() => endDateSelector.setTo(DateTime.now())}>
						Today
					</Badge>
				</div>
				<DateSelector bind:this={endDateSelector} bind:date={endDate} />
			</div>
		</div>
		<div class="title-separator border-y">Services</div>
		<div class="p-4">
			{#each Lake.services as service (service.key)}
				<div class="mb-4 last-of-type:mb-0">
					<div class="flex items-center">
						<div class="icon flex-grow-0 flex-shrink-0 mr-4">
							<img src={file(`/static/icons/${service.key}.png`)} alt={`${service.name} icon`} />
						</div>
						<span class="text-lg bold mr-4">{service.name}</span>
						<Badge type={true ? "success" : "info"}>{true ? "Enabled" : "Disabled"}</Badge>
					</div>
					<div class="flex">
						<div class="flex-grow-0 flex-shrink-0 mr-4">
							<div class="flex flex-col items-center justify-start">
								<div class="text-xs">Locked</div>
								<Toggle
									key={`${service.key}-locked`}
									class="service-toggle-locked"
									showLabel={false}
									value={true}
								/>
							</div>
							<div>
								<Button type="error" size="xs" class="mt-2">Clear</Button>
							</div>
						</div>
						<div>
							<div class="grid grid-cols-2 gap-2">
								<div>
									<label for="debug" class="label mt-0">Key</label>
									<input class="input" type="text" placeholder="Field key" />
								</div>
								<div>
									<label for="debug" class="label mt-0">Value</label>
									<input class="input" type="text" placeholder="Field value" />
								</div>
							</div>
							<Button type="info" size="sm" class="mt-2">
								<span>Add field</span>
								<i class="light-icon-plus text-lg ml-2" />
							</Button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
	<svelte:fragment slot="footer">
		<Button type="success" disabled={!closable} class="mr-2" on:click={save}>
			<span>Save</span>
			<i class="light-icon-upload text-lg ml-2" />
		</Button>
		<Button type="warning" disabled={!closable} on:click={() => hide()}>Close</Button>
	</svelte:fragment>
</Modal>

<style lang="postcss">
	.title-separator {
		@apply sticky top-0 z-10 p-2 border-tachikoma-600 text-2xl bg-tachikoma-800;
	}
</style>
