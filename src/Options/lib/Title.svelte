<script lang="ts">
	export let size: 1 | 2 | 3 | 4 | "1" | "2" | "3" | "4";

	let titleTag = `h${size}`;
	let titleTextSize: string = "text-base";
	if (size == 1) {
		titleTextSize = "text-3xl";
	} else if (size == 2) {
		titleTextSize = "text-2xl";
	} else if (size == 3) {
		titleTextSize = "text-xl";
	} else {
		titleTextSize = "text-lg";
	}
</script>

<svelte:element this={titleTag} class={`p-4 border-b border-b-gray ${titleTextSize}`}>
	<slot />
</svelte:element>
