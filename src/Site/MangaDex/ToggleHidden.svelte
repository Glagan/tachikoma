<script lang="ts">
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

<div class="cursor-pointer" title="Toggle hidden" on:click={toggle}>
	{#if visible}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="text-icon-black dark:text-icon-white text-false icon feather feather-eye inline mr-2"
		>
			<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
		</svg>
	{:else}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="text-icon-black dark:text-icon-white text-false icon feather feather-eye-off inline mr-2"
		>
			<path
				d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
			/><line x1="1" y1="1" x2="23" y2="23" />
		</svg>
	{/if}
	Toggle Hidden ({amount})
</div>
