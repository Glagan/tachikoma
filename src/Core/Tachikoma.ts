import { DateTime, Duration } from "luxon";
import zap from "@glagan/zap";
import type { Button } from "@glagan/zap/types";
import Overlay from "@Overlay";
import Updater, { Snapshots, SyncReport } from "./Updater";
import Title from "./Title";
import { file } from "./Utility";
import { Lake } from "./Lake";
import { DeleteStatus, deleteStatusDescription, SaveStatus, saveStatusDescription } from "./Service";

export class TachikomaClass {
	updaters: { [key: number]: { updater: Updater; cover?: string; time: DateTime } } = {};
	currentUpdater?: Updater;
	overlay: Overlay = new Overlay();

	clearTitle() {
		this.currentUpdater = undefined;
		this.overlay.setTitle(undefined);
		this.overlay.setCover(undefined);
		this.overlay.setLoading(false);
	}

	setTitle(title: Title, cover?: string): Updater {
		if (!title.id) {
			throw new Error("Missing id for Title");
		}
		this.overlay.setLoading(true);
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
		this.overlay.setTitle(this.currentUpdater.title);
		this.overlay.setCover(this.updaters[title.id].cover);
		this.overlay.setLoading(false);
		return this.currentUpdater;
	}

	async import(): Promise<Snapshots> {
		if (!this.currentUpdater) {
			throw new Error("Missing current Title in Tachikoma.import call");
		}
		this.overlay.setLoading(true);
		let result = await this.currentUpdater.import();
		this.overlay.setLoading(false);
		return result;
	}

	protected async cancelUpdate(report: SyncReport, updater: Updater) {
		this.overlay.setLoading(true);
		let result = await updater.restore(report.snapshots, report.localSnapshot);
		this.displaySyncReport(result, updater, false);
		this.overlay.setLoading(false);
	}

	protected displaySyncReport(report: SyncReport, updater: Updater, cancellable = true) {
		const buttons: Button[] = [
			{
				type: "error",
				value: "Close",
				onClick(notification) {
					notification.close();
				},
			},
		];
		if (cancellable) {
			buttons.unshift({
				type: "warning",
				value: "Cancel",
				onClick: (notification) => {
					notification.close();
					this.cancelUpdate(report, updater);
				},
			});
		}
		const title = updater.title;
		let message = [`${title.volume ? `Volume ${title.volume}` : ""} Chapter ${updater.title.chapter}`];
		for (const serviceKey in report.perServices) {
			const service = Lake.map[serviceKey];
			const result = report.perServices[serviceKey];
			const statusMessage =
				result.service.status > SaveStatus.LOADING
					? deleteStatusDescription[result.service.status as DeleteStatus]
					: saveStatusDescription[result.service.status as SaveStatus];
			message.push(
				`![${service.name}|${file(`/static/icons/${serviceKey}.png`)}] **${service.name}** >*>${statusMessage}<`
			);
		}
		zap.success({
			title: "Synced",
			message: message.join("\n"),
			buttons,
		});
	}

	async setProgress(progress: Progress) {
		if (!this.currentUpdater) {
			throw new Error("Missing current Title in Tachikoma.setProgress call");
		}
		this.overlay.setLoading(true);
		const localSnapshot = Title.serialize(this.currentUpdater.title);
		this.currentUpdater.title.setProgress(progress);
		let result = await this.currentUpdater.sync();
		result.localSnapshot = localSnapshot;
		this.displaySyncReport(result, this.currentUpdater, true);
		this.overlay.setLoading(false);
		return result;
	}

	async sync(): Promise<SyncReport> {
		if (!this.currentUpdater) {
			throw new Error("Missing current Title in Tachikoma.sync call");
		}
		this.overlay.setLoading(true);
		let result = await this.currentUpdater.sync();
		this.displaySyncReport(result, this.currentUpdater, true);
		this.overlay.setLoading(false);
		return result;
	}
}

export default new TachikomaClass();
