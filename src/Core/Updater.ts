import { Lake } from "./Lake";
import { Options } from "./Options";
import { ExternalStatus, SaveResult, TitleFetchFailure } from "./Service";
import Title from "./Title";

type TitleUpdateResult = {
	service: SaveResult;
	title: Title;
	// diff: any; // TODO
};

type SyncReport = {
	perServices: { [key: string]: TitleUpdateResult };
	snapshot: Snapshots;
};

type Snapshots = { [key: string]: TitleStorageInterface };

export default class Updater {
	title: Title;
	initialized: boolean = false;
	globalLoading: Promise<any> | null = null;
	loadingServices: Promise<Title | TitleFetchFailure | null>[] = [];
	state: { [key: string]: Title | TitleFetchFailure } = {};

	constructor(title: Title) {
		this.title = title;
	}

	/**
	 * Get the current values of all services on each services
	 * Set a list of promises for each services that are initialized
	 * @returns A promise that resolves when all services loaded
	 */
	async initialize(): Promise<any> {
		if (this.initialized) return;
		if (this.globalLoading) return this.globalLoading;
		const services = Options.filterServices(Object.keys(this.title.services));
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
		if (!this.title.services[serviceKey]) return { status: ExternalStatus.NO_ID };
		const promise = Lake.map[serviceKey]
			.get(this.title.services[serviceKey])
			.then((result) => (this.state[serviceKey] = result));
		this.loadingServices.push(promise);
		return promise;
	}

	/**
	 * Update all external services in ascending order (last to first) and apply new values.
	 * Save snapshots of the state for each Services and returns them.
	 * A Service with no snapshot means it was not in the list before.
	 */
	async mergeExternal(): Promise<Snapshots> {
		const snapshots: Snapshots = {};
		await this.initialize();
		const titleServices = Object.keys(this.title.services);
		const services = Options.services(true).filter((service) => titleServices.indexOf(service) >= 0);
		for (const serviceKey of services) {
			if (this.state[serviceKey] instanceof Title) {
				const externalTitle = this.state[serviceKey] as Title;
				snapshots[serviceKey] = Title.serialize(externalTitle);
				this.title.merge(externalTitle);
			}
		}
		return snapshots;
	}

	/**
	 * Apply the local title state to all external services.
	 * Save snapshots of the state for each Services and returns them.
	 * A Service with no snapshot means it was not in the list before.
	 */
	async applyToExternal(): Promise<Snapshots> {
		const snapshots: Snapshots = {};
		await this.initialize();
		const titleServices = Object.keys(this.title.services);
		const services = Options.services(true).filter((service) => titleServices.indexOf(service) >= 0);
		for (const serviceKey of services) {
			if (this.state[serviceKey] instanceof Title) {
				const externalTitle = this.state[serviceKey] as Title;
				snapshots[serviceKey] = Title.serialize(externalTitle);
				externalTitle.update(this.title);
			} else if (this.state[serviceKey].status === ExternalStatus.NOT_IN_LIST) {
				this.state[serviceKey] = this.title.clone();
			}
		}
		return snapshots;
	}

	// Update all external services to sync to the current state of the Title
	/**
	 * Call Update.applyToExternal and save snapshots, then call the Service.save function
	 * on each Service that are can be updated (No account or service error)
	 * @returns Sync report
	 */
	async sync(): Promise<SyncReport> {
		const report: SyncReport = {
			perServices: {},
			snapshot: await this.applyToExternal(),
		};
		const titleServices = Object.keys(this.title.services);
		const services = Options.services(true).filter((service) => titleServices.indexOf(service) >= 0);
		const updates: Promise<SaveResult>[] = [];
		for (const serviceKey of services) {
			const id = this.title.services[serviceKey];
			if (id && this.state[serviceKey] && this.state[serviceKey] instanceof Title) {
				const externalTitle = this.state[serviceKey] as Title;
				updates.push(
					Lake.map[serviceKey].save(id, externalTitle).then((result) => {
						report.perServices[serviceKey] = { service: result, title: externalTitle };
						return result;
					})
				);
			}
		}
		await Promise.all(updates);
		return report;
	}
}
