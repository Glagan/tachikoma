import { AnyService } from "./Service";
import * as Services from "@Service";
import { Options } from "./Options";

export namespace Lake {
	export const services: AnyService[] = [];
	export const map: { [key: string]: AnyService } = {};
	export const reverse: { [key: string]: AnyService } = {};

	for (const dependency of Object.values(Services)) {
		const service = (dependency as { default: AnyService }).default;
		services.push(service);
		map[service.key] = service;
		map[service.name] = service;
	}

	/**
	 * Get the list of *active* services from the options and their mapped related class.
	 */
	export const active = (): AnyService[] => {
		const serviceKeys = Options.services();
		const serviceClasses: AnyService[] = [];
		for (const serviceKey of serviceKeys) {
			if (map[serviceKey]) serviceClasses.push(map[serviceKey]);
		}
		return serviceClasses;
	};

	/**
	 * Get the list of *inactive* services from the options and their mapped related class.
	 */
	export const inactive = (): AnyService[] => {
		const serviceKeys = Options.services();
		return services.filter((service) => !serviceKeys.includes(service.key));
	};
}
