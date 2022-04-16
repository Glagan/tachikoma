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
import Title from "./Title.vue";
import ServiceCard from "./ServiceCard.vue";
import { useOptions } from "../Options";

defineProps<{ loading: boolean }>();

const { activeServices, inactiveServices } = useOptions();
</script>

<style></style>
