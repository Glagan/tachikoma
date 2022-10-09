import Title, { Status } from "@Core/Title";
import type { TitleInterface } from "@Core/Title";
import { writable } from "svelte/store";
import { Score } from "@Core/Score";
import { deepAssign } from "@Core/Utility";
import { Lake } from "@Core/Lake";

type TemporaryTitle = TitleInterface & {
	tmpIdentifiers: {
		[key: string]: {
			key: string;
			value: any;
		}[];
	};
};

export const temporaryTitleStore = (() => {
	const temporaryTitle: TemporaryTitle = {
		name: undefined,
		thumbnail: undefined,
		chapter: 0,
		volume: undefined,
		status: Status.NONE,
		score: undefined,
		startDate: undefined,
		endDate: undefined,
		lockedServices: [],
		services: {},
		tmpIdentifiers: {},
	};
	const { subscribe, set, update } = writable<TemporaryTitle>(temporaryTitle);

	return {
		subscribe,
		set,
		update,
		setFrom(title: Title) {
			temporaryTitle.name = title?.name;
			temporaryTitle.thumbnail = title?.thumbnail;
			temporaryTitle.chapter = title.chapter;
			temporaryTitle.volume = title.volume;
			temporaryTitle.status = title?.status;
			temporaryTitle.score = title?.score ? new Score(title.score) : undefined;
			temporaryTitle.startDate = title?.startDate?.set({});
			temporaryTitle.endDate = title?.endDate?.set({});
			temporaryTitle.lockedServices = [...title.lockedServices];
			temporaryTitle.services = deepAssign({}, title.services);
			temporaryTitle.tmpIdentifiers = {};
			for (const service of Lake.services) {
				if (!temporaryTitle.services[service.key]) {
					temporaryTitle.services[service.key] = {};
					temporaryTitle.tmpIdentifiers[service.key] = [];
				} else {
					temporaryTitle.tmpIdentifiers[service.key] = Object.keys(temporaryTitle.services[service.key]).map(
						(key) => ({ key, value: temporaryTitle.services[service.key][key] })
					);
				}
			}
			return set(temporaryTitle);
		},
		toggleServiceLock(service: string) {
			if (temporaryTitle.lockedServices) {
				const index = temporaryTitle.lockedServices.indexOf(service);
				if (index >= 0) {
					temporaryTitle.lockedServices.splice(index, 1);
				} else {
					temporaryTitle.lockedServices.push(service);
				}
			}
			return set(temporaryTitle);
		},
		useService(service: string, identifier: TitleIdentifier) {
			temporaryTitle.services[service] = { ...identifier };
			temporaryTitle.services = temporaryTitle.services;
			temporaryTitle.tmpIdentifiers[service] = Object.keys(identifier).map((key) => ({
				key,
				value: identifier[key],
			}));
			return set(temporaryTitle);
		},
		getTmpIdentifiers(service: string) {
			if (!temporaryTitle.tmpIdentifiers[service]) {
				temporaryTitle.tmpIdentifiers[service] = [];
			}
			return temporaryTitle.tmpIdentifiers[service];
		},
		addTmpIdentifier(service: string) {
			if (!temporaryTitle.tmpIdentifiers[service]) {
				temporaryTitle.tmpIdentifiers[service] = [];
			}
			temporaryTitle.tmpIdentifiers[service].push({ key: "", value: "" });
			return set(temporaryTitle);
		},
		removeTmpIdentifier(service: string, index: number) {
			if (!temporaryTitle.tmpIdentifiers[service]) {
				temporaryTitle.tmpIdentifiers[service] = [];
			}
			temporaryTitle.tmpIdentifiers[service].splice(index, 1);
			return set(temporaryTitle);
		},
	};
})();
