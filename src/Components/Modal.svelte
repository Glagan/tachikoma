<script lang="ts">
	import { fade } from "svelte/transition";

	export let title: string | undefined = undefined;
	export let closable: boolean = true;

	let visible = false;
	let wrapper: HTMLElement;
	function hideFromWrapper(event: Event) {
		if (!closable) {
			return;
		}
		if (event.target == wrapper) {
			visible = false;
		}
	}

	export function show() {
		visible = true;
	}

	export function hide() {
		visible = false;
	}
</script>

{#if visible}
	<div
		bind:this={wrapper}
		class="wrapper"
		class:cursor-pointer={closable}
		title={closable ? "Click to close" : undefined}
		transition:fade={{ duration: 250 }}
		on:click={hideFromWrapper}
	>
		<div class="modal" title="">
			{#if $$slots.header || title}
				<div class="header">
					<h5 class="text-2xl font-medium leading-normal truncate mr-4" {title}>
						<slot name="header" {show} {hide}>{title}</slot>
					</h5>
					<button type="button" title="Close" class="close-button" on:click={hide} />
				</div>
			{/if}
			<div class="body">
				<slot name="body" {show} {hide} />
			</div>
			{#if $$slots.footer}
				<div class="footer">
					<slot name="footer" {show} {hide} />
				</div>
			{/if}
		</div>
	</div>
{/if}

<style lang="postcss">
	.wrapper {
		@apply fixed z-[99] h-screen w-screen top-0 right-0 bottom-0 left-0 flex items-center justify-center bg-black bg-opacity-80;
	}

	.wrapper .modal {
		@apply relative flex flex-col w-auto max-w-2xl min-w-[30rem] m-4 overflow-hidden rounded-md border-none bg-tachikoma-700 text-gray-200 bg-clip-padding outline-none cursor-auto;
		max-height: calc(75vh - 4rem);
	}

	.wrapper .modal .header {
		@apply flex flex-shrink-0 items-center justify-between p-4 border-b border-tachikoma-600 bg-tachikoma-800 rounded-t-md;
	}

	.wrapper .modal .header .close-button {
		@apply box-content w-4 h-4 p-1 text-gray-100 border-none rounded-none opacity-50 focus:shadow-none focus:outline-none focus:opacity-100 hover:text-red-400 hover:opacity-75 hover:no-underline;
		background: url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22%23F3F4F6%22%3E%3Cpath d=%22M.293.293a1 1 0 011.414.0L8 6.586 14.293.293a1 1 0 111.414 1.414L9.414 8l6.293 6.293a1 1 0 01-1.414 1.414L8 9.414l-6.293 6.293A1 1 0 01.293 14.293L6.586 8 .293 1.707a1 1 0 010-1.414z%22/%3E%3C/svg%3E")
			50%/1em no-repeat;
	}

	.wrapper .modal .body {
		@apply overflow-y-auto relative scroll-smooth;
	}

	.wrapper .modal .footer {
		@apply flex flex-shrink-0 flex-wrap items-center justify-end p-4 border-t border-tachikoma-600 bg-tachikoma-800 rounded-b-md;
	}
</style>
