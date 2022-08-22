<script lang="ts">
	import type { OptionDescription } from "src/Options/Descriptions";
	import SitesEnabledOptions from "@Site/options";
	import Title from "../Title.svelte";
	import Color from "./Color.svelte";
	import ColorList from "./ColorList.svelte";
	import Number from "./Number.svelte";
	import Text from "./Text.svelte";
	import Toggle from "./Toggle.svelte";
	import { file } from "@Core/Utility";

	export let key: MutableOption;
	export let option: OptionDescription;

	let servicesEnabled = Object.keys(SitesEnabledOptions)
		.filter((siteKey) => SitesEnabledOptions[siteKey].enabledOptions.indexOf(key as MutableOption) >= 0)
		.map((siteKey) => SitesEnabledOptions[siteKey].key);
</script>

<Title size="4">
	<span>{option.name}</span>
	<div class="inline-block ml-4">
		{#each servicesEnabled as serviceKey}
			<img src={file(`/static/icons/${serviceKey}.png`)} alt={serviceKey} />
		{/each}
	</div>
</Title>
{#if option.type == "toggle"}
	<Toggle {key} {option} />
{:else if option.type == "color"}
	<Color {key} {option} />
{:else if option.type == "number"}
	<Number {key} {option} />
{:else if option.type == "string"}
	<Text {key} {option} />
{:else if option.type == "colorList"}
	<ColorList {key} {option} />
{/if}
