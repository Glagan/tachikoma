<script lang="ts">
	import type { NumberOptionDescription } from "src/Options/Descriptions";

	export let key: MutableOption;
	export let option: NumberOptionDescription;
</script>

<p>{option.description}</p>
<input type="number" />
