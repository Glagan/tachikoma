<script lang="ts">
	import { optionsStore } from "../stores/Options";
	import Title from "./Title.svelte";
	import ServiceCard from "./ServiceCard.svelte";
	import { Lake } from "@Core/Lake";

	$: activeServices = $optionsStore ? $optionsStore.services : [];
	$: inactiveServices = Lake.services
		.filter((service) => !activeServices.includes(service.key))
		.map((service) => service.key);
</script>

<Title size="1">Services</Title>
<Title size="2">
	Active <span>({activeServices.length})</span>
</Title>
<div>
	{#each activeServices as serviceKey (serviceKey)}
		<ServiceCard {serviceKey} />
	{/each}
</div>
<Title size="2">
	Inactive <span>({inactiveServices.length})</span>
</Title>
<div>
	{#each inactiveServices as serviceKey (serviceKey)}
		<ServiceCard {serviceKey} />
	{/each}
</div>
