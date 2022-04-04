import { Shelf } from "./Shelf";

export namespace ServiceStorage {
	export async function get<Values extends Record<string, any>>(service: string): Promise<Values | undefined> {
		return Shelf.get(`$${service}`) as unknown as Values | undefined;
	}

	export async function set<Values extends Record<string, any>>(service: string, value: Values): Promise<void> {
		return Shelf.set(`$${service}`, value);
	}

	export async function remove(service: string): Promise<void> {
		return Shelf.remove(`$${service}`);
	}
}
