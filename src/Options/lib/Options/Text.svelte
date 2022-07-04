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

<label>
	<p>{option.description}</p>
	<input type="text" bind:value />
</label>

<label for={key} class="label">
	{option.description}
</label>
<input type="text" class="input mx-2" id={key} placeholder={option.name} bind:value on:input={onChange} />
