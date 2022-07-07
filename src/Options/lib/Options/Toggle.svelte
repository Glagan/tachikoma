<script lang="ts">
	import { fly } from "svelte/transition";
	import { Options } from "@Core/Options";
	import type { OptionDescription, ToggleOptionDescription } from "src/Options/Descriptions";
	import Option from "./Option.svelte";
	import { optionsStore } from "../../stores/Options";

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

<label for={key} class="flex items-center cursor-pointer">
	<input type="checkbox" id={key} class="invisible peer" bind:checked={value} on:change={onChange} />
	<div
		class="relative rounded-full w-11 h-5 peer-focus peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 transition-all"
		class:bg-gray-400={!value}
		class:bg-green-600={value}
	>
		<span
			class="absolute top-1/2 -translate-y-1/2 left-[2px] rounded-full h-4 w-4 bg-gray-100 transition-all"
			class:toggle-checked={value}
			class:-translate-x-full={value}
		/>
	</div>
	<span
		class="ml-3 text-sm transition-colors"
		class:font-medium={!value}
		class:font-bold={value}
		class:text-green-600={value}
	>
		{#if value}
			Enabled
		{:else}
			Disabled
		{/if}
	</span>
</label>
{#if option.sub && value}
	<div class="sub-option ml-8" in:fly>
		{#each Object.keys(option.sub) as subOptionName}
			{@const subOption = subOptionFromString(subOptionName)}
			<Option key={subOptionWithType(subOptionName)} option={subOption} />
		{/each}
	</div>
{/if}

<style lang="postcss">
	.toggle-checked {
		left: calc(100% - 2px) !important;
	}
</style>
