<script lang="ts">
	import { Options } from "@Core/Options";
	import type { SimpleOptionDescription } from "src/Options/Descriptions";
	import { optionsStore } from "src/Options/stores/Options";

	export let key: MutableOption;
	export let option: SimpleOptionDescription;

	const { ref, key: optionKey } = Options.getOption(key);
	export let value: string | null | undefined = ref[optionKey] as string;
	let saveTimeout = 0;
	async function onChange() {
		clearTimeout(saveTimeout);
		/// @ts-expect-error setTimeout type is for the browser *not* NodeJS
		saveTimeout = setTimeout(() => {
			if (value == null) {
				value = undefined;
			}
			optionsStore.setOption(key, value);
			optionsStore.save();
		}, 200);
	}
</script>

<label for={key} class="label whitespace-break-spaces">{option.description}</label>
<div class="flex items-center">
	<input type="text" class="input" id={key} placeholder={option.name} bind:value on:input={onChange} />
	<div class="color-box">
		<!-- <div class="checkered" /> -->
		<div class="color" style={`background-color: ${value}`} />
	</div>
</div>
