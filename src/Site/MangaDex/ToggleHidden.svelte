<script lang="ts">
	import { EyeIcon, EyeOffIcon } from "svelte-feather-icons";
	export let amount: number;

	let visible = false;

	const nodeRows = Array.from(document.querySelectorAll<HTMLElement>(".chapter-state"));
	const rows = nodeRows.map((node) => {
		node.addEventListener("transitionend", (event) => {
			if (event.propertyName === "height") {
				node.style.height = "";
			}
		});
		return { node, height: node.dataset.height ? parseInt(node.dataset.height) : -1 };
	});

	function toggle() {
		for (const row of rows) {
			if (visible) {
				row.height = row.node.clientHeight;
			} else {
				row.node.style.height = `${row.height}px`;
			}
			row.node.classList.toggle("chapter-hidden");
		}
		visible = !visible;
	}
</script>

<div class="cursor-pointer" title="Toggle hidden" on:click={toggle} on:keypress>
	{#if visible}
		<EyeIcon class="inline" />
	{:else}
		<EyeOffIcon class="inline" />
	{/if}
	Toggle Hidden ({amount})
</div>
