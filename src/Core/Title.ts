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

export function statusToColor(status: Status): string {
	switch (status) {
		case Status.NONE:
			return "loading";
		case Status.READING:
			return "info";
		case Status.COMPLETED:
			return "success";
		case Status.PAUSED:
			return "warning";
		case Status.PLAN_TO_READ:
			return "loading";
		case Status.DROPPED:
			return "error";
		case Status.REREADING:
			return "info";
		case Status.WONT_READ:
			return "error";
	}
}

export type TitleInterface = {
	// Local **tachikoma** id
	id?: number;
	// Favorite name for the title
	name?: string;
	// Thumbnail URL for the title
	thumbnail?: string;

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
	lockedRelations?: string[];
	// List of {Service.key}, for Services and Sites
	relations: IdentifierList;
	// Creation time
	creation?: DateTime;
	// Last update time
	lastUpdate?: DateTime;
	// Last access time (update in all pages)
	lastAccess?: DateTime;
};

export function serviceIdentifierToToken(id: TitleIdentifier): string {
	return Object.keys(id)
		.sort()
		.map((key) => `${key}${id[key]}`)
		.join("");
}

export default class Title implements TitleInterface {
	id?: number;
	name?: string;
	thumbnail?: string;

	chapter: number;
	volume?: number;
	status: Status;

	score?: Score;

	startDate?: DateTime;
	endDate?: DateTime;

	lockedRelations: string[] = [];
	relations: { [key: string]: TitleIdentifier };

	// Meta
	creation?: DateTime;
	lastUpdate?: DateTime;
	lastAccess?: DateTime;

	constructor(title?: TitleInterface) {
		if (title) {
			this.id = title.id;
			this.name = title.name;
			this.thumbnail = title.thumbnail;

			this.chapter = title.chapter;
			this.volume = title.volume;
			this.status = title.status;
			this.score = title.score;

			this.startDate = title.startDate;
			this.endDate = title.endDate;

			this.lockedRelations = title.lockedRelations ?? [];
			this.relations = JSON.parse(JSON.stringify(title.relations));
			this.creation = title.creation;
			this.lastUpdate = title.lastUpdate;
			this.lastAccess = title.lastAccess;
		} else {
			this.chapter = 0;
			this.status = Status.NONE;
			this.relations = {};
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
			(this.volume === undefined && other.volume !== undefined && other.volume > 0) ||
			(this.volume !== undefined && other.volume !== undefined && this.volume < other.volume) ||
			(this.status === Status.NONE && other.status > Status.NONE) ||
			(this.score === undefined && other.score !== undefined) ||
			(this.startDate === undefined && other.startDate !== undefined) ||
			(this.endDate === undefined && other.endDate !== undefined) ||
			(this.name === undefined && other.name !== undefined) ||
			(this.thumbnail === undefined && other.thumbnail !== undefined)
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
			// Handle volume 0 being the same as undefined-
			(this.volume !== other.volume && (other.volume === undefined || other.volume > 0)) ||
			this.status !== other.status ||
			(this.score === undefined && other.score !== undefined) ||
			(this.score !== undefined && other.score === undefined) ||
			(this.score !== undefined && other.score !== undefined && !this.score.equal(other.score)) ||
			this.startDate?.toMillis() !== other.startDate?.toMillis() ||
			this.endDate?.toMillis() !== other.endDate?.toMillis() ||
			this.name !== other.name ||
			this.thumbnail !== other.thumbnail
		);
	}

	chapterIsNext(progress: Progress) {
		return (
			// Next from chapter (progress < current + 2) to handle sub-chapters
			(progress.chapter > this.chapter && progress.chapter < Math.floor(this.chapter) + 2) ||
			// Next from volume (progress == current + 1) if progress has no chapter
			(progress.chapter < 0 &&
				progress.volume !== undefined &&
				this.volume !== undefined &&
				progress.volume == this.volume + 1) ||
			// First chapter if not completed (Oneshot)
			(progress.chapter == 0 && this.chapter == 0 && this.status !== Status.COMPLETED)
		);
	}

	static serialize(title: TitleInterface): TitleStorageInterface {
		return {
			i: title.id!,
			n: title.name,
			h: title.thumbnail,
			c: title.chapter,
			v: title.volume,
			s: title.status,
			r: title.score ? [title.score.value, ...title.score.range] : undefined,
			t: title.startDate ? title.startDate.toMillis() : undefined,
			e: title.endDate ? title.endDate.toMillis() : undefined,
			l: title.lockedRelations ? title.lockedRelations : undefined,
			$: Object.keys(title.relations).length > 0 ? title.relations : undefined,
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
			thumbnail: title.h,
			chapter: title.c,
			volume: title.v,
			status: title.s,
			score: title.r ? new Score(title.r[0], [title.r[1], title.r[2]]) : undefined,
			startDate: title.t ? DateTime.fromMillis(title.t) : undefined,
			endDate: title.e ? DateTime.fromMillis(title.e) : undefined,
			lockedRelations: title.l ? title.l : [],
			relations: title.$ ? title.$ : {},
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
				if (!values.relations) values.relations = {};
				if (!values.chapter) values.chapter = 0;
				if (!values.status) values.status = Status.NONE;
			}
			const newTitle = new Title(values);
			newTitle.creation = DateTime.now();
			newTitle.lastAccess = DateTime.now();
			await newTitle.save();
			return newTitle;
		} /*  else if (createValues?.relations) {
			title.updateRelations(createValues.relations);
		} */
		title.lastAccess = DateTime.now();
		if (createValues) {
			if (createValues.name) {
				title.name = createValues.name;
			}
			if (createValues.thumbnail) {
				title.thumbnail = createValues.thumbnail;
			}
		}
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
			if (!this.startDate) {
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
	 * Set *all* values without any check (used in snapshot restore and direct edit)
	 * @param title New values
	 */
	update(title: TitleInterface) {
		this.name = title.name;
		this.thumbnail = title.thumbnail;
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
		this.lockedRelations = title.lockedRelations ?? [];
		this.relations = title.relations;
	}

	/**
	 * Update the list of relations to new IDs if needed.
	 * Check locked relations and do not update them.
	 */
	updateRelations(relations: IdentifierList): boolean {
		let updated = false;
		for (const key in relations) {
			if (
				this.lockedRelations.indexOf(key) < 0 &&
				// Compare TitleIdentifiers
				(!this.relations[key] ||
					!Object.keys(this.relations[key]).every((k) => this.relations[key] === relations[k]))
			) {
				this.relations[key] = relations[key];
				updated = true;
			}
		}
		return updated;
	}

	async save(): Promise<boolean> {
		// Check if the title has no ID to get one
		const titleRelations = Object.keys(this.relations);
		if (this.id === undefined) {
			// Check each Services keys
			const keys = titleRelations.map((key) => {
				return `=${key}>${serviceIdentifierToToken(this.relations[key])}` as `=${string}>${string}`;
			});
			const fromRelations = await Shelf.get(keys);
			// Select the preferred keys ordered by Services
			for (const key of titleRelations) {
				const relationkey = key as keyof typeof fromRelations;
				if (fromRelations[relationkey]) {
					this.id = fromRelations[relationkey];
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
		for (const relation of titleRelations) {
			if (this.relations[relation]) {
				update[`=${relation}>${serviceIdentifierToToken(this.relations[relation])}`] = this.id;
			}
		}
		await Shelf.set(update);
		return true;
	}

	async delete(): Promise<boolean> {
		if (this.id) {
			const keys = [`_${this.id}`];
			for (const key of Object.keys(this.relations)) {
				const relationkey = key as keyof typeof this.relations;
				keys.push(`=${relationkey}>${serviceIdentifierToToken(this.relations[relationkey])}`);
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
		// Use serialization to keep DateTime objects
		return new Title(Title.unserialize(Title.serialize(this)));
	}
}
