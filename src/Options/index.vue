<template>
	<div v-if="loading" class="spinner-grow inline-block w-12 h-12 bg-current rounded-full opacity-0" role="status">
		<span class="visually-hidden">Loading...</span>
	</div>
	<div v-if="!loading" class="body">
		<Services :loading="loading" />
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Options } from "@Core/Options";
import Services from "./Components/Services.vue";

const loading = ref(true);

onMounted(async () => {
	await Options.load();
	loading.value = false;
});
</script>

<style lang="css"></style>
