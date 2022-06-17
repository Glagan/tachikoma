<script lang="ts">
	import { fade } from "svelte/transition";

	export let title: string | undefined = undefined;

	let visible = false;
	export function show() {
		visible = true;
	}

	export function hide() {
		visible = false;
	}
</script>

{#if visible}
	<div class="modal" in:fade={{ duration: 200 }} out:fade={{ duration: 200 }}>
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="text-xl font-medium leading-normal">
						<slot name="header" {show} {hide}>{title}</slot>
					</h5>
					<button class="btn-close" on:click={hide}>
						<i class="light-icon-x" />
					</button>
				</div>
				<div class="modal-body">
					<slot {show} {hide} />
				</div>
				<div class="modal-footer">
					<slot name="footer" {show} {hide} />
				</div>
			</div>
		</div>
	</div>
{/if}

<style lang="postcss">
	.modal {
		@apply fixed top-0 left-0 w-full h-full outline-none overflow-x-hidden overflow-y-auto bg-black bg-opacity-60 z-50;
	}
	.modal-dialog {
		@apply flex items-center my-7 mx-auto relative w-auto pointer-events-none;
		max-width: 500px;
		height: calc(100% - 3.5rem);
		min-height: calc(100% - 3.5rem);
	}
	.modal-content {
		@apply shadow-lg relative flex flex-col w-full pointer-events-auto bg-clip-padding rounded-md outline-none border border-tachikoma-200 text-gray-200;
	}
	.modal-content {
		@apply max-h-full overflow-hidden overflow-y-auto;
	}
	.btn-close {
		@apply box-content w-6 h-6 p-1 border-none rounded-none opacity-50 focus:shadow-none focus:outline-none focus:opacity-100 text-red-200 hover:text-white hover:opacity-75 hover:no-underline;
	}
	.modal-header {
		@apply flex flex-shrink-0 items-center justify-between p-4 border-b border-tachikoma-200 bg-tachikoma-700 rounded-t-md;
	}
	.modal-body {
		@apply relative p-4 bg-tachikoma-600;
	}
	.modal-footer {
		@apply flex flex-shrink-0 flex-wrap items-center justify-end p-4 border-t border-tachikoma-200 bg-tachikoma-700 rounded-b-md;
	}
</style>
