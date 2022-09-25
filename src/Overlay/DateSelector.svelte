<script lang="ts">
	import { DateTime } from "luxon";

	export let date: DateTime | undefined;
	export let disabled: boolean = false;

	let day: number | undefined = date?.get("day");
	let month: number | undefined = date?.get("month");
	let year: number | undefined = date?.get("year");

	const days = new Array(31).fill(0).map((_, i) => i + 1);
	const months = Array.from({ length: 12 }, (_, i) => {
		return new Date(0, i).toLocaleString("en-US", { month: "long" });
	});
	const thisYear = DateTime.now().get("year");
	const years = new Array(30)
		.fill(0)
		.map((_, i) => thisYear - i)
		.reverse();

	export function setTo(date: DateTime | undefined) {
		day = date?.get("day");
		month = date?.get("month");
		year = date?.get("year");
		onChange("all");
	}

	function onChange(type: "all" | "day" | "month" | "year") {
		if ((!day || day < 0) && (!month || month < 0) && (!year || year < 0)) {
			date = undefined;
			return;
		}
		if (type == "month" && (typeof month != "number" || month < 0)) {
			day = -1;
		}
		if (!date) {
			date = DateTime.now().set({
				day: typeof day !== "number" || day < 0 ? 1 : day,
				month: typeof month !== "number" || month < 0 ? 1 : month,
				year: typeof year !== "number" || year < 0 ? 0 : year,
				hour: 0,
				minute: 0,
				second: 0,
				millisecond: 0,
			});
		} else {
			date = date.set({
				day: typeof day !== "number" || day < 0 ? 1 : day,
				month: typeof month !== "number" || month < 0 ? 1 : month,
				year: typeof year !== "number" || year < 0 ? 0 : year,
			});
		}
	}
</script>

<div class="flex">
	<select name="day" class="select mr-2" bind:value={day} {disabled} on:change={onChange.bind(null, "day")}>
		<option value={-1} />
		{#each days as day}
			<option value={day}>{day}</option>
		{/each}
	</select>
	<select name="month" class="select mr-2" bind:value={month} {disabled} on:change={onChange.bind(null, "month")}>
		<option value={-1} />
		{#each months as month, index}
			<option value={index + 1}>{month}</option>
		{/each}
	</select>
	<select name="year" class="select" bind:value={year} {disabled} on:change={onChange.bind(null, "year")}>
		<option value={-1} />
		{#each years as year}
			<option value={year} selected={year == thisYear}>{year}</option>
		{/each}
	</select>
</div>

<style lang="postcss">
</style>
