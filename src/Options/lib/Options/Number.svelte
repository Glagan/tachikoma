<script lang="ts">
	import { Options } from "@Core/Options";
	import type { NumberOptionDescription } from "src/Options/Descriptions";
	import { optionsStore } from "src/Options/stores/Options";

	export let key: MutableOption;
	export let option: NumberOptionDescription;

	const { ref, key: optionKey } = Options.getOption(key);
	export let value: number | null | undefined = ref[optionKey] as number;
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
<input type="number" class="input mx-2" id={key} placeholder={option.name} bind:value on:input={onChange} />
