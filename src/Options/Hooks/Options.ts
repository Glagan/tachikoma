import { Lake } from "@Core/Lake";
import { Options } from "@Core/Options";
import Service from "@Core/Service";
import { computed, ref } from "vue";

const values = ref<OptionList | null>(null);

const activeServices = computed(() => {
	if (values.value === null) return;
	const serviceClasses: Service[] = [];
	for (const serviceKey of values.value.services) {
		if (Lake.map[serviceKey]) serviceClasses.push(Lake.map[serviceKey]);
	}
	return serviceClasses;
});

const inactiveServices = computed(() => {
	if (values.value === null) return;
	const serviceKeys = values.value.services;
	return Lake.services.filter((service) => !serviceKeys.includes(service.key));
});

const serviceIndex = computed(() => {
	return (service: string) => {
		if (values.value === null) return -1;
		return values.value.services.indexOf(service);
	};
});
const serviceIsLast = computed(() => {
	return (service: string) => {
		if (values.value === null) return false;
		return values.value.services.indexOf(service) === values.value.services.length - 1;
	};
});

const hasService = (service: string) => {
	if (values.value === null) return false;
	return values.value.services.indexOf(service) >= 0;
};

const activateService = (service: string) => {
	if (values.value === null) return;
	if (!hasService(service)) {
		values.value.services.push(service);
	}
};

const deactivateService = (service: string) => {
	if (values.value === null) return;
	const index = values.value.services.indexOf(service);
	if (index >= 0) values.value.services.splice(index, 1);
};

const moveServiceUp = (service: string) => {
	if (values.value === null) return;
	const index = values.value.services.indexOf(service);
	if (index > 0) {
		values.value.services.splice(index, 1);
		values.value.services.splice(index - 1, 0, service);
	}
};

const moveServiceDown = (service: string) => {
	if (values.value === null) return;
	const index = values.value.services.indexOf(service);
	if (index >= 0 && index < values.value.services.length - 1) {
		values.value.services.splice(index, 1);
		values.value.services.splice(index + 1, 0, service);
	}
};

const save = async () => {
	if (values.value === null) return false;
	Options.set(JSON.parse(JSON.stringify(values.value)));
	await Options.save();
	return true;
};

export function useOptions() {
	if (values.value === null) {
		values.value = Options.values;
	}
	return {
		values: values!,
		services: {
			active: activeServices,
			inactive: inactiveServices,
			index: serviceIndex,
			isLast: serviceIsLast,
			has: hasService,
			activate: activateService,
			deactivate: deactivateService,
			moveUp: moveServiceUp,
			moveDown: moveServiceDown,
		},
		save,
	};
}
