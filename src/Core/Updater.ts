import { Lake } from "./Lake";
import { debug } from "./Logger";
import { Options } from "./Options";
import { DeleteResult, ExternalStatus, SaveResult, SaveStatus, TitleFetchFailure } from "./Service";
import Title, { Status } from "./Title";

type TitleUpdateResult =
	| {
			service: SaveResult;
			title: Title | TitleFetchFailure;
			// diff: any; // TODO
	  }
	| {
			service: DeleteResult;
			title: null;
	  };

export type SyncReport = {
	perServices: { [key: string]: TitleUpdateResult };
	localSnapshot?: TitleStorageInterface;
	snapshots: Snapshots;
};

export type Snapshots = { [key: string]: TitleStorageInterface | null };

export default class Updater {
	title: Title;
	initialized: boolean = false;
	globalLoading: Promise<any> | null = null;
	loadingServices: Promise<Title | TitleFetchFailure | null>[] = [];
	state: { [key: string]: Title | TitleFetchFailure } = {};
	listeners: { [key: number]: (title: Title) => void } = {};

	constructor(title: Title) {
		this.title = title;
	}

	addListener(listener: (title: Title) => void) {
		const id = Date.now();
		this.listeners[id] = listener;
		return id;
	}

	removeListener(id: number) {
		delete this.listeners[id];
	}

	removeAllListeners() {
		this.listeners = [];
	}

	emit() {
		for (const listener of Object.values(this.listeners)) {
			listener(this.title);
		}
	}

	/**
	 * Get the current values of all services on each services
	 * Set a list of promises for each services that are initialized
	 * @returns A promise that resolves when all services loaded
	 */
	async initialize(): Promise<any> {
		if (this.initialized) return;
		if (this.globalLoading) return this.globalLoading;
		const services = Options.filterServices(Object.keys(this.title.relations));
		for (const serviceKey of services) {
			this.initializeService(serviceKey);
		}
		this.globalLoading = Promise.all(this.loadingServices).then(() => {
			this.globalLoading = null;
			this.loadingServices = [];
			this.initialized = true;
		});
		return this.globalLoading;
	}

	/**
	 * Initialize the service if it exists and update it's state
	 * @param serviceKey
	 * @returns A promise that resolves when the service loaded
	 */
	async initializeService(serviceKey: string): Promise<Title | TitleFetchFailure> {
		if (!Lake.map[serviceKey]) return { status: ExternalStatus.NO_SERVICE };
		if (!this.title.relations[serviceKey]) return { status: ExternalStatus.NO_ID };
		const promise = Lake.map[serviceKey]
			.get(this.title.relations[serviceKey])
			.then((result) => (this.state[serviceKey] = result));
		this.loadingServices.push(promise);
		return promise;
	}

	/**
	 * Update all external services in ascending order (last to first) and apply new values.
	 * Save snapshots of the state for each Services and returns them.
	 * A Service with no snapshot means it was not in the list before.
	 */
	async import(): Promise<Snapshots> {
		const snapshots: Snapshots = {};
		await this.initialize();
		const titleRelations = Object.keys(this.title.relations);
		const services = Options.services(true).filter((service) => titleRelations.indexOf(service) >= 0);
		for (const serviceKey of services) {
			if (this.state[serviceKey] instanceof Title) {
				const externalTitle = this.state[serviceKey] as Title;
				snapshots[serviceKey] = Title.serialize(externalTitle);
				this.title.merge(externalTitle);
			}
		}
		await this.title.save();
		this.emit();
		return snapshots;
	}

	/**
	 * Update all external services to sync to the current state of the Title
	 * Save snapshots, then call the Service.save function
	 * on each Service that are can be updated (No account or service error).
	 * @returns Sync report
	 */
	async export(): Promise<SyncReport> {
		const report: SyncReport = {
			perServices: {},
			snapshots: {},
		};
		if (this.title.status === Status.NONE) {
			await this.title.save();
			this.emit();
			return report;
		}
		const titleRelations = Object.keys(this.title.relations);
		const services = Options.services(true).filter((service) => titleRelations.indexOf(service) >= 0);
		const updates: Promise<SaveResult>[] = [];
		for (const serviceKey of services) {
			const id = this.title.relations[serviceKey];
			if (
				id &&
				this.state[serviceKey] &&
				(this.state[serviceKey] instanceof Title ||
					this.state[serviceKey].status === ExternalStatus.NOT_IN_LIST)
			) {
				const service = Lake.map[serviceKey];
				let externalTitle = this.state[serviceKey];
				if (!(this.state[serviceKey] instanceof Title)) {
					this.state[serviceKey];
				}
				// Check if the title needs to be updated on the service
				if (externalTitle instanceof Title) {
					if (service.needUpdate(externalTitle, this.title)) {
						report.snapshots[serviceKey] = Title.serialize(externalTitle);
						updates.push(
							service.save(id, externalTitle).then((result) => {
								report.perServices[serviceKey] = { service: result, title: externalTitle };
								return result;
							})
						);
					} else {
						report.perServices[serviceKey] = {
							service: { status: SaveStatus.ALREADY_SYNCED },
							title: externalTitle,
						};
						debug(
							"Update skipped on",
							serviceKey,
							"for",
							Title.serialize(externalTitle),
							"from",
							Title.serialize(this.title)
						);
					}
					// The externalTitle is still always updated to avoid and ignore
					// -- unnecessary difference checks in other functions
					externalTitle.update(this.title);
				} else {
					debug("Created missing title on", serviceKey);
					// `null` snapshot mean it didn't exist previously
					report.snapshots[serviceKey] = null;
					const externalTitle = this.title.clone();
					this.state[serviceKey] = externalTitle;
					updates.push(
						service.save(id, externalTitle).then((result) => {
							report.perServices[serviceKey] = { service: result, title: externalTitle };
							return result;
						})
					);
				}
			}
		}
		await Promise.all([this.title.save(), Promise.all(updates)]);
		this.emit();
		return report;
	}

	/**
	 * Restore each snapshots from a Snapshots set and Update all services that were restored
	 * @returns Sync report
	 */
	async restore(snapshots: Snapshots, localSnapshot?: TitleStorageInterface): Promise<SyncReport> {
		const report: SyncReport = {
			perServices: {},
			snapshots: {},
		};
		if (localSnapshot) {
			this.title.restore(localSnapshot);
		}
		const snapshotServices = Object.keys(snapshots);
		const updates: Promise<SaveResult | DeleteResult>[] = [];
		for (const serviceKey of snapshotServices) {
			const id = this.title.relations[serviceKey];
			if (id) {
				const service = Lake.map[serviceKey];
				const snapshot = snapshots[serviceKey];
				if (snapshot !== null) {
					const externalTitle = Title.fromStorage(snapshot);
					updates.push(
						service.save(id, externalTitle).then((result) => {
							report.perServices[serviceKey] = { service: result, title: externalTitle };
							return result;
						})
					);
				} else {
					updates.push(
						service.delete(id).then((result) => {
							report.perServices[serviceKey] = { service: result, title: null };
							return result;
						})
					);
				}
			}
		}
		await Promise.all([this.title.save(), Promise.all(updates)]);
		this.emit();
		return report;
	}
}
