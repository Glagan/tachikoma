<script lang="ts">
	import type { OptionDescription } from "src/Options/Descriptions";
	import Title from "../Title.svelte";
	import Color from "./Color.svelte";
	import ColorList from "./ColorList.svelte";
	import Number from "./Number.svelte";
	import Text from "./Text.svelte";
	import Toggle from "./Toggle.svelte";

	export let key: MutableOption;
	export let option: OptionDescription;
</script>

<Title size="4">
	{option.name}
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
