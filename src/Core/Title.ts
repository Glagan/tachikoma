import { DateTime } from "luxon";
import { Options } from "./Options";
import { Shelf } from "./Shelf";
import { StorageTitle } from "./Storage";

export default class Title implements TitleInterface {
	public id?: number;
	public name?: string;

	public chapter: number;
	public volume?: number;
	public status: Status;

	public score?: number;

	public startDate?: DateTime;
	public endDate?: DateTime;

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
			this.score !== other.score ||
			this.startDate !== other.startDate ||
			this.endDate !== other.endDate ||
			this.name !== other.name
		);
	}

	/**
	 * Convert a Title to a StorageTitle which has JSON valid values and shortened keys.
	 * @returns storageTitle
	 */
	toStorage(): TitleStorageInterface {
		return {
			i: this.id!,
			n: this.name,
			c: this.chapter,
			v: this.volume,
			s: this.status,
			r: this.score,
			t: this.startDate ? this.startDate.toMillis() : undefined,
			e: this.startDate ? this.startDate.toMillis() : undefined,
			$: Object.keys(this.services).length > 0 ? this.services : undefined,
			o: this.creation ? this.creation.toMillis() : undefined,
			u: this.lastUpdate ? this.lastUpdate.toMillis() : undefined,
			a: this.lastAccess ? this.lastAccess.toMillis() : undefined,
		};
	}

	/**
	 * Convert a StorageTitle to a Title.
	 * @returns storageTitle
	 */
	static fromStorage(title: TitleStorageInterface): Title {
		return new Title({
			id: title.i,
			name: title.n,
			chapter: title.c,
			volume: title.v,
			status: title.s,
			score: title.r,
			startDate: title.t ? DateTime.fromMillis(title.t) : undefined,
			endDate: title.e ? DateTime.fromMillis(title.e) : undefined,
			services: title.$ ? title.$ : {},
			creation: title.o ? DateTime.fromMillis(title.o) : undefined,
			lastUpdate: title.u ? DateTime.fromMillis(title.u) : undefined,
			lastAccess: title.a ? DateTime.fromMillis(title.a) : undefined,
		});
	}

	static async get(id: number): Promise<Title | null>;
	static async get(service: string, id: TitleIdentifier): Promise<Title | null>;
	static async get(idOrService: number | string, idForService?: TitleIdentifier): Promise<Title | null> {
		const rawTitle = await (typeof idOrService === "string"
			? Shelf.get(`=${idOrService}>${idForService}`)
			: Shelf.get(`_${idOrService}`));
		if (typeof rawTitle === "number") {
			const titleFromRelation = await Shelf.get(`_${rawTitle}`);
			if (titleFromRelation) {
				return Title.fromStorage(titleFromRelation);
			} else {
				// Remove broken relation
				await Shelf.remove(`_${rawTitle}`);
			}
		} else if (typeof rawTitle === "object") {
			return Title.fromStorage(rawTitle);
		}
		return null;
	}

	/**
	 * Update the Title to the given progress, and update related other fields if needed (Status, Dates...).
	 * @param progress New progress value
	 */
	update(progress: Progress) {
		// TODO
		// setValue(title, "chapter", to.chapter);
		// if (to.volume) setValue(title, "volume", to.volume);
		// if (setValue(title, "status", Status.READING)) {
		// 	if (!title.start) setValue(title, "start", now());
		// }
		// if (title.max?.chapter) {
		// 	if (title.chapter >= title.max.chapter) {
		// 		setValue(title, "status", Status.COMPLETED);
		// 		if (!title.end) setValue(title, "end", now());
		// 	}
		// }
	}

	/**
	 * Update a title values without any effects.
	 * @param title New values
	 */
	set(title: TitleInterface) {
		// TODO
	}

	async save(): Promise<boolean> {
		// Check if the title has no ID to get one
		const titleServices = Options.filterServices(Object.keys(this.services));
		if (this.id === undefined) {
			// Check each Services keys
			const fromServices = await Shelf.get(
				titleServices.map((key) => {
					return `=${key}>${this.services[key]}` as `=${string}>${string}`;
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
		const update = {
			[`_${this.id!}`]: this.toStorage(),
		} as unknown as StorageTitle;
		for (const relation of titleServices) {
			if (this.services[relation]) {
				update[`=${relation}>${this.services[relation]}`] = this.id;
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
				keys.push(`=${relationkey}>${this.services[relationkey]}`);
			}
			await Shelf.remove(keys);
			this.id = undefined;
		}
		return true;
	}

	async refresh(): Promise<void> {
		// TODO
	}
}
