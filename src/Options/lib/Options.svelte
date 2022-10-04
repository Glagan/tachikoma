<script lang="ts">
	import Title from "./Title.svelte";
	import { descriptions } from "../Descriptions";
	import type { OptionDescription } from "../Descriptions";
	import OptionIcon from "./OptionIcon.svelte";
	import Option from "./Options/Option.svelte";

	// Restore lost types after Object.key
	function listWithType(
		list: {
			[key in MutableOption]?: OptionDescription;
		},
		name: string
	): OptionDescription {
		return list[name as MutableOption]!;
	}

	function optionWithType(name: string): MutableOption {
		return name as MutableOption;
	}
</script>

<Title size="1">Options</Title>
<div>
	{#each Object.keys(descriptions) as rootCategoryKey}
		{@const rootCategory = descriptions[rootCategoryKey]}
		<Title size="2">
			{#if rootCategory.icon}
				<OptionIcon icon={rootCategory.icon} />
			{/if}{rootCategoryKey}
		</Title>
		{#each Object.keys(rootCategory.list) as categoryKey}
			{@const category = rootCategory.list[categoryKey]}
			<Title size="3">
				{#if category.icon}
					<OptionIcon icon={category.icon} />
				{/if}{categoryKey}
			</Title>
			{#each Object.keys(category.list) as optionName}
				{@const option = listWithType(category.list, optionName)}
				<Option key={optionWithType(optionName)} {option} />
			{/each}
		{/each}
	{:else}
		No Options !
	{/each}
</div>
