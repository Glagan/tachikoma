import { Options } from "@Core/Options";
import { writable } from "svelte/store";

export const loading = writable(true);
export const optionsStore = (() => {
	const { subscribe, set, update } = writable<OptionList | null>(null);

	return {
		subscribe,
		set,
		update,
		load: async () => {
			loading.set(true);
			await Options.load();
			set(Options.values);
			loading.set(false);
		},
		activateService: (which: string) => {
			if (!Options.loaded) {
				return;
			}
			if (!Options.hasService(which)) {
				Options.enableService(which);
			}
			return set(Options.values);
		},
		deactivateService: (which: string) => {
			if (!Options.loaded) {
				return;
			}
			if (Options.hasService(which)) {
				Options.disableService(which);
			}
			return set(Options.values);
		},
		moveServiceUp: (which: string) => {
			if (!Options.loaded) {
				return;
			}
			const index = Options.values.services.indexOf(which);
			if (index > 0) {
				Options.values.services.splice(index, 1);
				Options.values.services.splice(index - 1, 0, which);
			}
			return set(Options.values);
		},
		moveServiceDown: (which: string) => {
			if (!Options.loaded) {
				return;
			}
			const index = Options.values.services.indexOf(which);
			if (index >= 0 && index < Options.values.services.length - 1) {
				Options.values.services.splice(index, 1);
				Options.values.services.splice(index + 1, 0, which);
			}
			return set(Options.values);
		},
		setOption: (key: MutableOption, value: any) => {
			console.log("set", key, "to", value);
		},
		save: () => {
			if (!Options.loaded) {
				return;
			}
			return Options.save();
		},
	};
})();
