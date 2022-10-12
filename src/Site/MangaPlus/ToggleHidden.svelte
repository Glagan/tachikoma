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

<div class="toggle-button" title="Toggle hidden" on:click={toggle} on:keypress>
	{#if visible}
		<EyeIcon size="20" class="inline" />
	{:else}
		<EyeOffIcon size="20" class="inline" />
	{/if}
	<span style="margin-left: 0.5rem">Toggle Hidden ({amount})</span>
</div>

<style>
	.toggle-button {
		display: flex;
		align-items: center;
		border-radius: 0.25rem;
		background-color: rgb(250, 204, 21);
		color: black;
		font-size: 0.875rem;
		line-height: 1.25rem;
		padding: 6px;
		cursor: pointer;
		transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
	}
	.toggle-button:hover {
		border-radius: 0.5rem;
	}
</style>
