<script lang="ts">
	import { fly } from "svelte/transition";
	import { Options } from "@Core/Options";
	import type { OptionDescription, ToggleOptionDescription } from "src/Options/Descriptions";
	import Option from "./Option.svelte";
	import { optionsStore } from "../../stores/Options";
	import Toggle from "@Components/Toggle.svelte";

	export let key: MutableOption;
	export let option: ToggleOptionDescription;

	// Restore lost types after Object.keys for nested toggle sub options
	function subOptionWithType(name: string): MutableOption {
		return name as MutableOption;
	}
	function subOptionFromString(name: string): OptionDescription {
		return option.sub![name as MutableOption]!;
	}

	const { ref, key: optionKey } = Options.getOption(key);
	export let value: boolean = ref[optionKey] as boolean;
	async function onChange() {
		optionsStore.setOption(key, value);
		optionsStore.save();
	}
</script>

<label for={key} class="label">
	{option.description}
</label>
<div class="form-check form-switch">
	<input
		id={key}
		class="appearance-none w-9 -ml-10 rounded-full float-left h-5 align-top bg-no-repeat bg-contain bg-gray-300 focus:outline-none cursor-pointer shadow-sm"
		type="checkbox"
		role="switch"
		bind:checked={value}
		on:change={onChange}
	/>
</div>

<Toggle {key} bind:value on:change={onChange} />
{#if option.sub && value}
	<div class="sub-option ml-8" in:fly>
		{#each Object.keys(option.sub) as subOptionName}
			{@const subOption = subOptionFromString(subOptionName)}
			<Option key={subOptionWithType(subOptionName)} option={subOption} />
		{/each}
	</div>
{/if}

<style lang="postcss">
</style>
