import Service from "./Service";
import * as Services from "@Service";
import { Options } from "./Options";

export namespace Lake {
	export const services: Service[] = [];
	export const map: { [key: string]: Service } = {};
	export const reverse: { [key: string]: Service } = {};

	for (const dependency of Object.values(Services)) {
		const service = (dependency as { default: Service }).default;
		services.push(service);
		map[service.key] = service;
		map[service.name] = service;
	}

	/**
	 * Get the list of *active* services from the options and their mapped related class.
	 */
	export const active = (): Service[] => {
		const serviceKeys = Options.services();
		const serviceClasses: Service[] = [];
		for (const serviceKey of serviceKeys) {
			if (map[serviceKey]) serviceClasses.push(map[serviceKey]);
		}
		return serviceClasses;
	};

	/**
	 * Get the list of *inactive* services from the options and their mapped related class.
	 */
	export const inactive = (): Service[] => {
		const serviceKeys = Options.services();
		return services.filter((service) => !serviceKeys.includes(service.key));
	};
}
