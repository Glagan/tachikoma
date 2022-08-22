<script lang="ts">
	export let size: 1 | 2 | 3 | 4 | "1" | "2" | "3" | "4";
	let classes: string = "";

	let titleTag = `h${size}`;
	let titleTextSize: string = "title text-base";
	if (size == 1) {
		titleTextSize = "title level-1 text-3xl border-t bg-tachikoma-900";
	} else if (size == 2) {
		titleTextSize = "title level-2 text-2xl border-t bg-tachikoma-800";
	} else if (size == 3) {
		titleTextSize = "title level-3 text-xl bg-tachikoma-700";
	} else {
		titleTextSize = "title level-4 text-lg";
	}

	export { classes as class };
</script>

<svelte:element this={titleTag} class={`p-4 border-b border-gray ${titleTextSize} ${classes}`} {...$$restProps}>
	<slot />
</svelte:element>

<!-- Style is located in index.css since Svelte trim unused rules -->
