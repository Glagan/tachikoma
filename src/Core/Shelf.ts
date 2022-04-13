import { storage } from "webextension-polyfill";
import { NEXT_KEY, StorageMap } from "./Storage";

export namespace Shelf {
	export async function get<K extends keyof StorageMap>(key: K): Promise<StorageMap[K] | undefined>;
	export async function get<K extends keyof StorageMap>(key: K[]): Promise<Partial<{ [key in K]: StorageMap[K] }>>;
	export async function get<K extends keyof StorageMap>(
		key: K | K[]
	): Promise<Partial<{ [key in K]: StorageMap[K] }> | StorageMap[K] | undefined> {
		const fixedKeys = key as string | string[];
		const result = await storage.local.get(fixedKeys);
		if (Array.isArray(fixedKeys)) return result as Partial<{ [key in K]: StorageMap[K] }>;
		if (result[fixedKeys] !== undefined) return result[fixedKeys];
		return undefined;
	}

	export function all(): Promise<Partial<StorageMap>> {
		return storage.local.get(null);
	}

	export async function set<K extends keyof StorageMap>(key: K, value: StorageMap[K]): Promise<void>;
	export async function set(items: Partial<StorageMap>): Promise<void>;
	export async function set<K extends keyof StorageMap>(
		itemsOrKey: K | Partial<StorageMap>,
		value?: StorageMap[K]
	): Promise<void> {
		if (typeof itemsOrKey === "object") {
			return storage.local.set(itemsOrKey);
		}
		return storage.local.set({ [itemsOrKey]: value });
	}

	export function remove(keys: string | string[]): Promise<void> {
		return storage.local.remove(keys);
	}

	export function clear(): Promise<void> {
		return storage.local.clear();
	}

	export async function next(): Promise<number> {
		const next = await Shelf.get(NEXT_KEY);
		if (next === undefined) {
			await Shelf.set(NEXT_KEY, 2);
			return 1;
		}
		await Shelf.set(NEXT_KEY, next + 1);
		return next;
	}
}
