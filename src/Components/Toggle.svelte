<script lang="ts">
	export let key: string;
	export let value: boolean;
	export let showLabel: boolean = true;
</script>

<label for={key} class="toggle-wrapper flex items-center" {...$$restProps}>
	<input type="checkbox" id={key} class="appearance-none hidden invisible peer" bind:checked={value} on:change />
	<div
		class="toggle-content relative rounded-full w-11 h-5 peer-focus peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 transition-all cursor-pointer"
		class:bg-gray-400={!value}
		class:bg-green-600={value}
	>
		<span
			class="absolute top-1/2 -translate-y-1/2 left-[2px] rounded-full h-4 w-4 bg-gray-100 transition-all"
			class:toggle-checked={value}
			class:-translate-x-full={value}
		/>
	</div>
	{#if showLabel}
		<span
			class="ml-3 text-sm transition-colors cursor-pointer"
			class:font-medium={!value}
			class:font-bold={value}
			class:text-green-600={value}
		>
			{#if value}
				Enabled
			{:else}
				Disabled
			{/if}
		</span>
	{/if}
</label>

<style lang="postcss">
	.toggle-checked {
		left: calc(100% - 2px) !important;
	}
</style>
