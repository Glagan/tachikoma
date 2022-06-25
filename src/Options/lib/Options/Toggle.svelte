<script lang="ts">
	import type { OptionDescription, ToggleOptionDescription } from "src/Options/Descriptions";
	import Title from "../Title.svelte";
	import Option from "./Option.svelte";

	export let key: MutableOption;
	export let option: ToggleOptionDescription;

	// Restore lost types after Object.keys for nested toggle sub options
	function subOptionWithType(name: string): MutableOption {
		return name as MutableOption;
	}
	function subOptionFromString(name: string): OptionDescription {
		return option.sub![name as MutableOption]!;
	}

	export let value: boolean = false;
	function onChange() {}
</script>

<label for={key}>{option.description}</label>
<input id={key} type="checkbox" bind:checked={value} on:change={onChange} />

{#if option.sub}
	{#each Object.keys(option.sub) as subOptionName}
		{@const subOption = subOptionFromString(subOptionName)}
		<div class="ml-8">
			<Option key={subOptionWithType(subOptionName)} option={subOption} />
		</div>
	{/each}
{/if}
