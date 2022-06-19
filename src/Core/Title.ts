import { DateTime } from "luxon";
import { Score } from "./Score";
import { Shelf } from "./Shelf";
import type { StorageTitle } from "./Storage";

export type ProgressResult = {
	started: boolean;
	updatedStart: boolean;
	completed: boolean;
	updatedEnd: boolean;
};

export enum Status {
	NONE,
	READING,
	COMPLETED,
	PAUSED,
	PLAN_TO_READ,
	DROPPED,
	REREADING,
	WONT_READ,
}
export function statusToString(status: Status): string {
	switch (status) {
		case Status.NONE:
			return "Not in list";
		case Status.READING:
			return "Reading";
		case Status.COMPLETED:
			return "Completed";
		case Status.PAUSED:
			return "Paused";
		case Status.PLAN_TO_READ:
			return "Plan to read";
		case Status.DROPPED:
			return "Dropped";
		case Status.REREADING:
			return "Re-reading";
		case Status.WONT_READ:
			return "Won't read";
	}
}

export type TitleInterface = {
	// Local **tachikoma** id
	id?: number;
	// Favorite name for the title
	name?: string;

	// Last read chapter
	chapter: number;
	// Volume of the current chapter
	volume?: number;
	// Stauts of the title
	status: Status;

	// Score from any given range
	score?: Score;

	// Start time (automatically updated)
	startDate?: DateTime;
	// End time (automatically updated)
	endDate?: DateTime;

	// List of locked Service keys
	lockedServices?: string[];
	// List of {Service.key}
	services: ServiceList;
	// Creation time
	creation?: DateTime;
	// Last update time
	lastUpdate?: DateTime;
	// Last access time (update in all pages)
	lastAccess?: DateTime;
};

function serviceIdentifierToToken(id: TitleIdentifier): string {
	return Object.keys(id)
		.sort()
		.map((key) => `${key}${id[key]}`)
		.join("");
}

export default class Title implements TitleInterface {
	public id?: number;
	public name?: string;

	public chapter: number;
	public volume?: number;
	public status: Status;

	public score?: Score;

	public startDate?: DateTime;
	public endDate?: DateTime;

	public lockedServices: string[] = [];
	public services: { [key: string]: TitleIdentifier };

	// Meta
	public creation?: DateTime;
	public lastUpdate?: DateTime;
	public lastAccess?: DateTime;

	constructor(title?: TitleInterface) {
		if (title) {
			this.id = title.id;
			this.name = title.name;

			this.chapter = title.chapter;
			this.volume = title.volume;
			this.status = title.status;
			this.score = title.score;

			this.startDate = title.startDate;
			this.endDate = title.endDate;

			this.lockedServices = title.lockedServices ?? [];
			this.services = JSON.parse(JSON.stringify(title.services));
			this.creation = title.creation;
			this.lastUpdate = title.lastUpdate;
			this.lastAccess = title.lastAccess;
		} else {
			this.chapter = 0;
			this.status = Status.NONE;
			this.services = {};
			this.creation = DateTime.now();
		}
	}

	/**
	 * Check if at least one field (no relation to a service, checking *all* values) is more recent in `other`.
	 * @param other The title to check against
	 * @returns true if *other* is more recent
	 */
	isMoreRecent(other: TitleInterface): boolean {
		return (
			other.chapter > this.chapter ||
			(this.volume === undefined && other.volume !== undefined) ||
			(this.volume !== undefined && other.volume !== undefined && this.volume < other.volume) ||
			(this.status === Status.NONE && other.status > Status.NONE) ||
			(this.score === undefined && other.score !== undefined) ||
			(this.startDate === undefined && other.startDate !== undefined) ||
			(this.endDate === undefined && other.endDate !== undefined) ||
			(this.name === undefined && other.name !== undefined)
		);
	}

	/**
	 * Check if at least one field (no relation to a service, checking *all* values) is different in `other`.
	 * @param other The title to check against
	 * @returns true if *other* is more recent
	 */
	isDifferent(other: TitleInterface): boolean {
		return (
			this.chapter !== other.chapter ||
			this.volume !== other.volume ||
			this.status !== other.status ||
			(this.score === undefined && other.score !== undefined) ||
			(this.score !== undefined && other.score === undefined) ||
			(this.score !== undefined && other.score !== undefined && !this.score.equal(other.score)) ||
			this.startDate !== other.startDate ||
			this.endDate !== other.endDate ||
			this.name !== other.name
		);
	}

	static serialize(title: TitleInterface): TitleStorageInterface {
		return {
			i: title.id!,
			n: title.name,
			c: title.chapter,
			v: title.volume,
			s: title.status,
			r: title.score ? [title.score.value, ...title.score.range] : undefined,
			t: title.startDate ? title.startDate.toMillis() : undefined,
			e: title.startDate ? title.startDate.toMillis() : undefined,
			l: title.lockedServices ? title.lockedServices : undefined,
			$: Object.keys(title.services).length > 0 ? title.services : undefined,
			o: title.creation ? title.creation.toMillis() : undefined,
			u: title.lastUpdate ? title.lastUpdate.toMillis() : undefined,
			a: title.lastAccess ? title.lastAccess.toMillis() : undefined,
		};
	}

	/**
	 * Convert a Title to a StorageTitle which has JSON valid values and shortened keys.
	 * @returns storageTitle
	 */
	toStorage(): TitleStorageInterface {
		return Title.serialize(this);
	}

	static unserialize(title: TitleStorageInterface): TitleInterface {
		return {
			id: title.i,
			name: title.n,
			chapter: title.c,
			volume: title.v,
			status: title.s,
			score: title.r ? new Score(title.r[0], [title.r[1], title.r[2]]) : undefined,
			startDate: title.t ? DateTime.fromMillis(title.t) : undefined,
			endDate: title.e ? DateTime.fromMillis(title.e) : undefined,
			lockedServices: title.l ? title.l : [],
			services: title.$ ? title.$ : {},
			creation: title.o ? DateTime.fromMillis(title.o) : undefined,
			lastUpdate: title.u ? DateTime.fromMillis(title.u) : undefined,
			lastAccess: title.a ? DateTime.fromMillis(title.a) : undefined,
		};
	}

	/**
	 * Convert a StorageTitle to a Title.
	 * @returns storageTitle
	 */
	static fromStorage(title: TitleStorageInterface): Title {
		return new Title(Title.unserialize(title));
	}

	static async get(id: number): Promise<Title | null>;
	static async get(service: string, id: TitleIdentifier): Promise<Title | null>;
	static async get(idOrService: number | string, id?: TitleIdentifier): Promise<Title | null> {
		const rawTitle = await (typeof idOrService === "string"
			? Shelf.get(`=${idOrService}>${serviceIdentifierToToken(id!)}`)
			: Shelf.get(`_${idOrService}`));
		if (typeof rawTitle === "number") {
			const titleFromRelation = await Shelf.get(`_${rawTitle}`);
			if (titleFromRelation) {
				const title = Title.fromStorage(titleFromRelation);
				title.lastAccess = DateTime.now();
				return title;
			} else {
				// Remove broken relation
				await Shelf.remove(`_${rawTitle}`);
			}
		} else if (typeof rawTitle === "object") {
			const title = Title.fromStorage(rawTitle);
			title.lastAccess = DateTime.now();
			return title;
		}
		return null;
	}

	static async getOrCreate(
		service: string,
		id: TitleIdentifier,
		createValues?: Partial<TitleInterface>
	): Promise<Title> {
		const title = await Title.get(service, id);
		if (!title) {
			const values: TitleInterface | undefined = createValues
				? JSON.parse(JSON.stringify(createValues))
				: undefined;
			if (values) {
				if (!values.services) values.services = {};
				if (!values.chapter) values.chapter = 0;
				if (!values.status) values.status = Status.NONE;
			}
			const newTitle = new Title(values);
			newTitle.creation = DateTime.now();
			newTitle.lastAccess = DateTime.now();
			await newTitle.save();
			return newTitle;
		}
		title.lastAccess = DateTime.now();
		await title.save();
		return title;
	}

	/**
	 * Try to merge the title and keep the "highest" values.
	 * This is used to merge Services values to a local Title.
	 * @param title The title to merge to
	 */
	merge(title: TitleInterface) {
		if (Math.floor(title.chapter) > this.chapter) {
			this.chapter = title.chapter;
		}
		if (title.volume && (this.volume === undefined || title.volume > this.volume)) {
			this.volume = title.volume;
		}
		if (title.status !== Status.NONE && this.status === Status.NONE) {
			this.status = title.status;
		} else if (title.status === Status.COMPLETED) {
			this.status = title.status;
		}
		if ((!this.score && title.score) || (this.score && title.score && !this.score.equal(title.score))) {
			this.score = new Score(title.score);
		}
		if (!this.startDate && title.startDate) {
			this.startDate = title.startDate;
		}
		if (!this.endDate && title.endDate) {
			this.endDate = title.endDate;
		}
		// + meta ?
	}

	/**
	 * Update the Title to the given progress, and update related other fields if needed (Status, Dates...).
	 * @param progress New progress value
	 */
	setProgress(progress: Progress): ProgressResult {
		const result: ProgressResult = { started: false, updatedStart: false, completed: false, updatedEnd: false };
		this.chapter = progress.chapter;
		if (progress.volume) {
			this.volume = progress.volume;
		}
		if (this.status === Status.NONE || this.status === Status.PLAN_TO_READ) {
			this.status = Status.READING;
			result.started = true;
			if (this.startDate) {
				this.startDate = DateTime.now();
				result.updatedStart = true;
			}
		}
		// TODO max chapter
		// if (this.chapter >= this.maxChapter) {
		// 	this.status = Status.COMPLETED;
		// 	result.completed = true;
		// 	if (!this.endDate) {
		// 		this.endDate = DateTime.now();
		// 		result.updatedEnd = true;
		// 	}
		// }
		return result;
	}

	/**
	 * Update a title values without any effects, and without checking if they are "higher".
	 * TODO Set *all* values (this function is used in snapshot restore + direct edit)
	 * @param title New values
	 */
	update(title: TitleInterface) {
		this.chapter = title.chapter;
		this.volume = title.volume;
		this.status = title.status;
		if (title.score) {
			if (this.score) {
				this.score.setValue(title.score);
			} else {
				this.score = new Score(title.score);
			}
		} else {
			this.score = undefined;
		}
		this.startDate = title.startDate;
		this.endDate = title.endDate;
	}

	/**
	 * Update the list of Services to new ID if needed.
	 * Check locked Services and do not update them.
	 */
	updateServices(services: ServiceList): boolean {
		let updated = false;
		for (const serviceKey in services) {
			if (
				this.lockedServices.indexOf(serviceKey) < 0 &&
				// Compare TitleIdentifiers
				(!this.services[serviceKey] ||
					!Object.keys(this.services[serviceKey]).every((k) => this.services[serviceKey] === services[k]))
			) {
				this.services[serviceKey] = services[serviceKey];
				updated = true;
			}
		}
		return updated;
	}

	async save(): Promise<boolean> {
		// Check if the title has no ID to get one
		// const titleServices = Options.filterServices(Object.keys(this.services));
		const titleServices = Object.keys(this.services);
		if (this.id === undefined) {
			// Check each Services keys
			const fromServices = await Shelf.get(
				titleServices.map((key) => {
					return `=${key}>${serviceIdentifierToToken(this.services[key])}` as `=${string}>${string}`;
				})
			);
			// Select the preferred keys ordered by Services
			for (const key of titleServices) {
				const relationkey = key as keyof typeof fromServices;
				if (fromServices[relationkey]) {
					this.id = fromServices[relationkey];
				}
			}
			// Check if there is stil no ID and create one
			if (this.id === undefined) {
				this.id = await Shelf.next();
			}
		}
		// Now that we have an ID we can save the titles
		// -- and it's relations
		this.lastUpdate = DateTime.now();
		const update = {
			[`_${this.id!}`]: this.toStorage(),
		} as unknown as StorageTitle;
		for (const relation of titleServices) {
			if (this.services[relation]) {
				update[`=${relation}>${serviceIdentifierToToken(this.services[relation])}`] = this.id;
			}
		}
		await Shelf.set(update);
		return true;
	}

	async delete(): Promise<boolean> {
		if (this.id) {
			const keys = [`_${this.id}`];
			for (const key of Object.keys(this.services)) {
				const relationkey = key as keyof typeof this.services;
				keys.push(`=${relationkey}>${serviceIdentifierToToken(this.services[relationkey])}`);
			}
			await Shelf.remove(keys);
			this.id = undefined;
		}
		return true;
	}

	async refresh(): Promise<void> {
		// TODO
	}

	restore(snapshot: TitleStorageInterface): void {
		const title = Title.unserialize(snapshot);
		this.update(title);
	}

	clone(): Title {
		return new Title(JSON.parse(JSON.stringify(this)));
	}
}
