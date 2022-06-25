<script lang="ts">
	import type { SimpleOptionDescription } from "src/Options/Descriptions";

	export let key: MutableOption;
	export let option: SimpleOptionDescription;

	let value: string | undefined;
</script>

<p>{option.description}</p>
<input type="text" bind:value />
