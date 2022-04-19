<template>
	<div>
		<Title size="1">Services</Title>
		<Title size="2">
			Active <span v-if="!loading"> ({{ active.length }}) </span>
		</Title>
		<div>
			<ServiceCard v-for="service in active" :key="`active-${service.key}`" :service="service" />
		</div>
		<Title size="2">
			Inactive <span v-if="!loading"> ({{ inactive.length }}) </span>
		</Title>
		<div>
			<ServiceCard v-for="service in inactive" :key="`inactive-${service.key}`" :service="service" />
		</div>
	</div>
</template>

<script setup lang="ts">
import Title from "./Title.vue";
import ServiceCard from "./ServiceCard.vue";
import { useOptions } from "../Hooks/Options";

defineProps<{ loading: boolean }>();

const {
	services: { active, inactive },
} = useOptions();
</script>

<style></style>
