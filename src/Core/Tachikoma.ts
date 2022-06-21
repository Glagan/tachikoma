import { DateTime, Duration } from "luxon";
import Overlay from "@Overlay";
import Updater, { Snapshots, SyncReport } from "./Updater";
import type Title from "./Title";

export class TachikomaClass {
	updaters: { [key: number]: { updater: Updater; cover?: string; time: DateTime } } = {};
	currentUpdater?: Updater;
	overlay: Overlay = new Overlay();

	setTitle(title: Title, cover?: string): Updater {
		if (!title.id) {
			throw new Error("Missing id for Title");
		}
		if (this.overlay) {
			this.overlay.setLoading(true);
		}
		// Update cache and set the current updater
		if (
			this.updaters[title.id] &&
			this.updaters[title.id].time.diffNow("minutes") < Duration.fromDurationLike({ minutes: 5 })
		) {
			this.currentUpdater = this.updaters[title.id].updater;
			this.updaters[title.id].time = DateTime.now();
			if (cover) this.updaters[title.id].cover = cover;
		} else {
			this.currentUpdater = new Updater(title);
			this.updaters[title.id] = { updater: this.currentUpdater, cover, time: DateTime.now() };
		}
		// Update Overlay
		if (this.overlay) {
			this.overlay.setTitle(this.currentUpdater.title);
			this.overlay.setCover(this.updaters[title.id].cover);
			this.overlay.setLoading(false);
		}
		return this.currentUpdater;
	}

	async import(): Promise<Snapshots> {
		if (!this.currentUpdater) {
			throw new Error("Missing current Title in Tachikoma.import call");
		}
		if (this.overlay) {
			this.overlay.setLoading(true);
		}
		let result = await this.currentUpdater.import();
		if (this.overlay) {
			this.overlay.setLoading(false);
		}
		return result;
	}

	async sync(): Promise<SyncReport> {
		if (!this.currentUpdater) {
			throw new Error("Missing current Title in Tachikoma.sync call");
		}
		if (this.overlay) {
			this.overlay.setLoading(true);
		}
		let result = await this.currentUpdater.sync();
		if (this.overlay) {
			this.overlay.setLoading(false);
		}
		return result;
	}
}

export default new TachikomaClass();
