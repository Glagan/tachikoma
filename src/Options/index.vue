<template>
	<div class="body">
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
