import { Shelf } from "@Core/Shelf";
import { runtime } from "webextension-polyfill";
import { OPTIONS_KEY } from "./Storage";
import { nestedKeyReference } from "./Utility";

export namespace Options {
	export let loaded = false;
	export const defaults: OptionList = {
		// Options that can override by Site options
		highlight: true,
		colors: {
			highlights: ["rgba(82, 190, 90, 0.6)", "rgba(107, 177, 95, 0.6)", "rgba(55, 168, 61, 0.6)"],
			nextChapter: "rgba(104, 115, 251, 0.4)",
			higherChapter: "",
			lowerChapter: "rgba(180, 102, 75, 0.5)",
			openedChapter: "rgba(28, 135, 141, 0.4)",
		},
		notifications: {
			enabled: true,
			displayProgressUpdated: true,
			errorNotifications: true,
			errorDuration: 4000,
			infoDuration: 4000,
			successDuration: 4000,
		},
		lists: {
			hideHigher: false,
			hideLower: true,
			hideLast: false,
		},
		reading: {
			saveOpenedChapters: true,
			chaptersSaved: 400,
			saveOnlyHigher: true,
			saveOnlyNext: false,
			confirmChapter: true,
			updateOnlyInList: false,
			saveOnLastPage: false,
		},
		// History
		// TODO [Feature] Add reading History
		// biggerHistory: true,
		// refreshHistory: false,
		// Services
		services: [],
		// Sync
		// TODO [Feature] Add Sync on startup
		// checkOnStartup: false,
		// checkOnStartupMainOnly: true,
		// checkOnStartupCooldown: 30,
		// Global
		// TODO [Feature] Add mochi to find Services links
		// useMochi: false,
		version: parseFloat(runtime.getManifest().version),
		subVersion: parseInt(/\.(\d+)$/.exec(runtime.getManifest().version)![1]),
	} as unknown as OptionList; // TODO

	export let values: OptionList = JSON.parse(JSON.stringify(defaults)); // Avoid references

	export async function load() {
		const options = await Shelf.get(OPTIONS_KEY);
		if (options) {
			Object.assign(Options.values, options);
		} else await Shelf.set({ [OPTIONS_KEY]: defaults });
		loaded = true;
	}

	export function reset() {
		Options.values = JSON.parse(JSON.stringify(defaults));
	}

	export function enableService(service: string) {
		Options.values.services.push(service);
	}

	export function disableService(service: string) {
		const index = Options.values.services.indexOf(service);
		if (index >= 0) {
			Options.values.services.splice(index, 1);
		}
	}

	export function hasService(service: string) {
		return Options.values.services.includes(service);
	}

	export function services(reverse: boolean = false) {
		if (reverse) {
			return Options.values.services.slice().reverse();
		}
		return Options.values.services.slice();
	}

	export function filterServices(services: string[]) {
		return services.filter((service) => hasService(service));
	}

	export function getColors(site: string): Colors {
		const colors = Options.values.colors;
		if (site in Options.values) {
			const siteOptions = Options.values[site];
			if (typeof siteOptions === "object" && "colors" in siteOptions && typeof siteOptions.colors === "object") {
				const siteColors = siteOptions.colors as Partial<Colors>;
				const emptyFiltered: Partial<Colors> = {};
				Object.keys(siteOptions.colors)
					.filter((k) => !!siteOptions.colors[k as keyof Colors])
					.map((k) => ((emptyFiltered as any)[k] = siteColors[k as keyof Colors]));
				return { ...colors, ...emptyFiltered };
			}
		}
		return { ...colors };
	}

	/**
	 * Breakdown leaf (MutableOption key) to retrieve the last object containing the last key.
	 * [site].colors.nextChapter
	 * 	-> return the *colors* object and *nextChapter*
	 * 	-> { colors: { nextChapter }, key: 'nextChapter' }
	 */
	export function getOption<E extends any, R extends Record<string, E> = Record<string, E>>(
		key: MutableOption
	): { ref: R; key: keyof R } {
		return nestedKeyReference(Options.values, key);
	}

	export function setOption(key: MutableOption, value: any) {
		const { ref, key: optionKey } = nestedKeyReference(Options.values, key);
		ref[optionKey] = value;
	}

	export function set(options: OptionList): void {
		Object.assign(Options.values, options);
	}

	export function save(): Promise<void> {
		return Shelf.set(OPTIONS_KEY, values);
	}
}
