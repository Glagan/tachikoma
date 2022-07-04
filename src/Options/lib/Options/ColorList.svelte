<script lang="ts">
	import Button from "@Components/Button.svelte";

	import { Options } from "@Core/Options";
	import type { SimpleOptionDescription } from "src/Options/Descriptions";
	import { optionsStore } from "src/Options/stores/Options";
	import { bind, each } from "svelte/internal";

	export let key: MutableOption;
	export let option: SimpleOptionDescription;

	const { ref, key: optionKey } = Options.getOption(key);
	export let value: string[] | null | undefined = ref[optionKey] as string[];
	if (!value) {
		value = [];
	}

	function addColor() {
		if (!value) {
			value = [];
		}
		value.push("");
		value = value;
		onChange();
	}

	function removeColor(index: number) {
		if (!value) {
			value = [];
		}
		if (index >= 0 && value.length > index) {
			value.splice(index, 1);
		}
		value = value;
		onChange();
	}

	let saveTimeout = 0;
	async function onChange() {
		clearTimeout(saveTimeout);
		/// @ts-expect-error setTimeout type is for the browser *not* NodeJS
		saveTimeout = setTimeout(() => {
			if (value == null || (Array.isArray(value) && value.length == 0)) {
				value = undefined;
			}
			optionsStore.setOption(key, value);
			optionsStore.save();
		}, 200);
	}
</script>

<p class="label">
	{option.description}
</p>
{#if value}
	{#each value as color, index}
		<div class="flex items-center mb-2">
			<Button type="error" size="sm" class="mr-2" on:click={removeColor.bind(null, index)}>
				<i class="light-icon-trash" />
			</Button>
			<input
				type="text"
				class="input"
				placeholder={`${option.name} #${index}`}
				bind:value={color}
				on:input={onChange}
			/>
			<div class="color-box">
				<!-- <div class="checkered" /> -->
				<div class="color" style={`background-color: ${color}`} />
			</div>
		</div>
	{/each}
{/if}
<Button type="info" on:click={addColor}>
	<i class="light-icon-circle-plus mr-2" /> Add Color
</Button>
