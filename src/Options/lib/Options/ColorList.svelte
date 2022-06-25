<script lang="ts">
	import type { SimpleOptionDescription } from "src/Options/Descriptions";

	export let key: MutableOption;
	export let option: SimpleOptionDescription;
</script>

<p>{option.description}</p>
<input type="text" />
<input type="text" />
