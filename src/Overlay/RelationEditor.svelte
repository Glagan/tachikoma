<script lang="ts">
	import { Trash2Icon, PlusCircleIcon } from "svelte-feather-icons";
	import type Service from "@Core/Service";
	import { file } from "@Core/Utility";
	import Badge from "@Components/Badge.svelte";
	import Button from "@Components/Button.svelte";
	import Toggle from "@Components/Toggle.svelte";
	import { Options } from "@Core/Options";
	import { temporaryTitleStore } from "./TemporaryTitle";
	import { Lake } from "@Core/Lake";

	export let relationKey: string;
	export let disabled: boolean = false;

	let service = Lake.map[relationKey];

	const enabled = Options.hasService(relationKey);
	$: locked = $temporaryTitleStore.lockedRelations!.indexOf(relationKey) >= 0;
</script>

<div class="mb-4 last-of-type:mb-0">
	<div class="flex items-center">
		<div class="icon flex-grow-0 flex-shrink-0 mr-2">
			<img src={file(`/static/icons/${relationKey}.png`)} alt={`${service ? service.name : relationKey} icon`} />
		</div>
		<span class="text-lg font-bold mr-2">{service ? service.name : relationKey}</span>
		{#if service}
			<Badge type={enabled ? "success" : "info"}>{enabled ? "Enabled" : "Disabled"}</Badge>
		{:else}
			<Badge type="loading">Site</Badge>
		{/if}
	</div>
	<div class="flex mt-2">
		<div class="flex-grow-0 flex-shrink-0 mr-4">
			<div class="flex flex-col items-center justify-start">
				<div class="text-xs">Locked</div>
				<Toggle
					key={`${relationKey}-locked`}
					class="service-toggle-locked"
					{disabled}
					showLabel={false}
					value={locked}
					on:change={() => temporaryTitleStore.toggleRelationLock(relationKey)}
				/>
			</div>
			<div>
				<Button type="error" size="xs" class="mt-2" {disabled}>Clear</Button>
			</div>
		</div>
		<div>
			{#each $temporaryTitleStore.tmpIdentifiers[relationKey] as tmpIdentifier, index}
				<div class="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
					<div>
						<label for="debug" class="label mt-0">Key</label>
						<input
							class="input"
							type="text"
							bind:value={tmpIdentifier.key}
							{disabled}
							placeholder="Field key"
						/>
					</div>
					<div>
						<label for="debug" class="label mt-0">Value</label>
						<input
							class="input"
							type="text"
							bind:value={tmpIdentifier.value}
							{disabled}
							placeholder="Field value"
						/>
					</div>
					<Button
						type="error"
						size="xs"
						class="mb-1"
						{disabled}
						on:click={temporaryTitleStore.removeTmpIdentifier.bind(null, relationKey, index)}
					>
						<Trash2Icon />
					</Button>
				</div>
			{/each}
			<Button
				type="info"
				size="sm"
				class="mt-2"
				{disabled}
				on:click={temporaryTitleStore.addTmpIdentifier.bind(null, relationKey)}
			>
				<span>Add field</span>
				<PlusCircleIcon class="ml-2" />
			</Button>
		</div>
	</div>
</div>
