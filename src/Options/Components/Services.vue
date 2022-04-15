<template>
	<div>
		<Title size="1">Services</Title>
		<Title size="2">
			Active <span v-if="!loading"> ({{ activeServices.length }}) </span>
		</Title>
		<div>
			<ServiceCard v-for="service in activeServices" :key="`active-${service.key}`" :service="service" />
		</div>
		<Title size="2">
			Inactive <span v-if="!loading"> ({{ inactiveServices.length }}) </span>
		</Title>
		<div>
			<ServiceCard v-for="service in inactiveServices" :key="`inactive-${service.key}`" :service="service" />
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
		activeServices.value = Lake.active();
		inactiveServices.value = Lake.inactive();
	}
);
</script>

<style></style>
