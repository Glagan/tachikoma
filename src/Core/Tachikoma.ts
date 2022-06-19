import { DateTime, Duration } from "luxon";
import Overlay from "@Overlay";
import Updater from "./Updater";
import type Title from "./Title";

export class TachikomaClass {
	updaters: { [key: number]: { updater: Updater; cover?: string; time: DateTime } } = {};
	currentUpdater?: Updater;
	overlay: Overlay = new Overlay();

	setTitle(title: Title, cover?: string): Updater {
		if (!title.id) {
			throw new Error("Missing id for Title");
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
		}
		return this.currentUpdater;
	}
}

export default new TachikomaClass();
