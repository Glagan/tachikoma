<template>
	<div>
		<Title size="1">Services</Title>
		<Title size="2">
			Active <span v-if="!loading"> ({{ activeServices.length }}) </span>
		</Title>
		<Title size="2">
			Inactive <span v-if="!loading"> ({{ inactiveServices.length }}) </span>
		</Title>
		<div>
			<ServiceCard v-for="service in inactiveServices" :key="`inactive-${service.key}`" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { Lake } from "@Core/Lake";
import Title from "./Title.vue";
import { ref, watch } from "vue";
import Service from "@Core/Service";
import ServiceCard from "./ServiceCard.vue";

const props = defineProps<{ loading: boolean }>();

const activeServices = ref<Service[]>([]);
const inactiveServices = ref<Service[]>([]);

watch(
	() => props.loading,
	() => {
		activeServices.value.length = 0;
		activeServices.value.push(...Lake.active());
		inactiveServices.value.length = 0;
		inactiveServices.value.push(...Lake.inactive());
		console.log("reloaded services", activeServices.value.length, inactiveServices.value.length);
		console.log("all services", Lake.services);
	}
);
</script>

<style></style>
