import Title, { Status } from "@Core/Title";
import type { TitleInterface } from "@Core/Title";
import { writable } from "svelte/store";
import { Score } from "@Core/Score";
import { deepAssign } from "@Core/Utility";
import { Lake } from "@Core/Lake";
import Relations from "@Core/Relations";

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
		lockedRelations: [],
		relations: {},
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
			temporaryTitle.lockedRelations = [...title.lockedRelations];
			temporaryTitle.relations = deepAssign({}, title.relations);
			temporaryTitle.tmpIdentifiers = {};
			for (const relationKey of Relations) {
				if (!temporaryTitle.relations[relationKey]) {
					temporaryTitle.relations[relationKey] = {};
					temporaryTitle.tmpIdentifiers[relationKey] = [];
				} else {
					temporaryTitle.tmpIdentifiers[relationKey] = Object.keys(temporaryTitle.relations[relationKey]).map(
						(key) => ({ key, value: temporaryTitle.relations[relationKey][key] })
					);
				}
			}
			return set(temporaryTitle);
		},
		toggleRelationLock(relation: string) {
			if (temporaryTitle.lockedRelations) {
				const index = temporaryTitle.lockedRelations.indexOf(relation);
				if (index >= 0) {
					temporaryTitle.lockedRelations.splice(index, 1);
				} else {
					temporaryTitle.lockedRelations.push(relation);
				}
			}
			return set(temporaryTitle);
		},
		useService(service: string, identifier: TitleIdentifier) {
			temporaryTitle.relations[service] = { ...identifier };
			temporaryTitle.relations = temporaryTitle.relations;
			temporaryTitle.tmpIdentifiers[service] = Object.keys(identifier).map((key) => ({
				key,
				value: identifier[key],
			}));
			return set(temporaryTitle);
		},
		getTmpIdentifiers(relation: string) {
			if (!temporaryTitle.tmpIdentifiers[relation]) {
				temporaryTitle.tmpIdentifiers[relation] = [];
			}
			return temporaryTitle.tmpIdentifiers[relation];
		},
		addTmpIdentifier(relation: string) {
			if (!temporaryTitle.tmpIdentifiers[relation]) {
				temporaryTitle.tmpIdentifiers[relation] = [];
			}
			temporaryTitle.tmpIdentifiers[relation].push({ key: "", value: "" });
			return set(temporaryTitle);
		},
		removeTmpIdentifier(relation: string, index: number) {
			if (!temporaryTitle.tmpIdentifiers[relation]) {
				temporaryTitle.tmpIdentifiers[relation] = [];
			}
			temporaryTitle.tmpIdentifiers[relation].splice(index, 1);
			return set(temporaryTitle);
		},
	};
})();
