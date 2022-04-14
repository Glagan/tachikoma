<template>
	<div class="m-4 p-4 flex flex-row items-center rounded-md border bg-tachikoma-600 border-tachikoma-500 shadow-md">
		<div class="icon flex-grow-0 flex-shrink-0 mr-4">
			<img :src="filePath('/icons/tk.png')" alt="Service icon" />
		</div>
		<div class="name-status flex flex-col flex-grow flex-shrink text-ellipsis">
			<div class="name text-xl font-bold">Name</div>
			<div class="status mt-1">
				<span class="badge success">Logged in</span>
			</div>
		</div>
		<div class="actions flex flex-row flex-grow-0 flex-shrink-0 items-center">
			<div class="main-action">
				<button class="button success">Activate</button>
			</div>
			<div class="sub-actions flex flex-col ml-4">
				<button class="button sm info mb-2"><i class="light-icon-chevron-up"></i></button>
				<button class="button sm info"><i class="light-icon-chevron-down"></i></button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { file } from "@Core/Utility";

const filePath = (path: string) => {
	return file(path);
};
</script>

<style>
.badge {
	@apply text-sm inline-block py-1 px-2.5 leading-none text-center whitespace-nowrap align-baseline font-bold rounded;
}
.badge.loading {
	@apply bg-purple-600 text-white;
}
.badge.success {
	@apply bg-lime-600 text-white;
}
.badge.danger {
	@apply bg-red-600 text-white;
}
.badge.warning {
	@apply bg-yellow-500 text-white;
}
.badge.info {
	@apply bg-blue-400 text-white;
}

.button {
	@apply inline-block leading-tight text-center rounded shadow-md hover:shadow-lg focus:shadow-lg focus:outline-none focus:ring-0 active:shadow-lg transition duration-150 ease-in-out;
}
.button,
.button.md {
	@apply px-6 py-2.5 font-medium text-sm;
}
.button.sm {
	@apply px-4 py-2.5 font-medium text-xs;
}
.button.loading {
	@apply bg-purple-500 text-white hover:bg-purple-600  focus:bg-purple-600 active:bg-purple-700;
}
.button.success {
	@apply bg-lime-600 text-white hover:bg-lime-700  focus:bg-lime-700 active:bg-lime-800;
}
.button.danger {
	@apply bg-red-500 text-white hover:bg-red-600  focus:bg-red-600 active:bg-red-700;
}
.button.warning {
	@apply bg-yellow-500 text-white hover:bg-yellow-600  focus:bg-yellow-600 active:bg-yellow-700;
}
.button.info {
	@apply bg-blue-500 text-white hover:bg-blue-600  focus:bg-blue-600 active:bg-blue-700;
}
</style>
