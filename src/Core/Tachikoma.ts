import { DateTime, Duration } from "luxon";
import zap from "@glagan/zap";
import type { Button, Notification } from "@glagan/zap/types";
import Overlay from "@Overlay";
import Updater, { Snapshots, SyncReport } from "./Updater";
import Title from "./Title";
import { file } from "./Utility";
import { Lake } from "./Lake";
import { DeleteStatus, deleteStatusDescription, SaveStatus, saveStatusDescription } from "./Service";

type UpdaterWithMetadata = { updater: Updater; cover?: string; time: DateTime };

export class TachikomaClass {
	updaters: { [key: number]: UpdaterWithMetadata } = {};
	current?: UpdaterWithMetadata;
	overlay: Overlay = new Overlay();
	syncNotification: Notification | undefined;

	clearTitle() {
		this.current = undefined;
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
			this.current = this.updaters[title.id];
			this.updaters[title.id].time = DateTime.now();
			if (cover) this.updaters[title.id].cover = cover;
		} else {
			this.current = { updater: new Updater(title), cover, time: DateTime.now() };
			this.updaters[title.id] = this.current;
		}
		// Update Overlay
		this.overlay.setTitle(this.current.updater.title);
		this.overlay.setCover(this.updaters[title.id].cover);
		this.overlay.setLoading(false);
		return this.current.updater;
	}

	async import(): Promise<Snapshots> {
		if (!this.current) {
			throw new Error("Missing current Title in Tachikoma.import call");
		}
		this.overlay.setLoading(true);
		const result = await this.current.updater.import();
		this.overlay.setLoading(false);
		return result;
	}

	protected async cancelUpdate(report: SyncReport, updater: UpdaterWithMetadata) {
		this.overlay.setLoading(true);
		const result = await updater.updater.restore(report.snapshots, report.localSnapshot);
		this.displaySyncReport(result, updater, false);
		this.overlay.setLoading(false);
	}

	protected displaySyncReport(report: SyncReport, updater: UpdaterWithMetadata, cancellable = true) {
		// Ignore empty reports and reports with every services already synced
		if (
			Object.keys(report.perServices).length === 0 ||
			Object.values(report.perServices).every((report) => report.service.status === SaveStatus.ALREADY_SYNCED)
		) {
			return undefined;
		}
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
		const title = updater.updater.title;
		const message = [`${title.volume ? `Volume ${title.volume}` : ""} Chapter ${updater.updater.title.chapter}`];
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
		return zap.success({
			title: "Synced",
			image: updater.cover ? updater.cover : undefined,
			message: message.join("\n"),
			buttons,
		});
	}

	async setProgress(progress: Progress) {
		if (!this.current) {
			throw new Error("Missing current Title in Tachikoma.setProgress call");
		}
		this.overlay.setLoading(true);
		if (this.syncNotification) {
			this.syncNotification.destroy();
			this.syncNotification = undefined;
		}
		const localSnapshot = Title.serialize(this.current.updater.title);
		this.current.updater.title.setProgress(progress);
		const result = await this.current.updater.export();
		result.localSnapshot = localSnapshot;
		this.displaySyncReport(result, this.current, true);
		this.overlay.setLoading(false);
		return result;
	}

	async export(): Promise<SyncReport> {
		if (!this.current) {
			throw new Error("Missing current Title in Tachikoma.export call");
		}
		this.overlay.setLoading(true);
		if (this.syncNotification) {
			this.syncNotification.destroy();
			this.syncNotification = undefined;
		}
		const result = await this.current.updater.export();
		this.syncNotification = this.displaySyncReport(result, this.current, true);
		this.overlay.setLoading(false);
		return result;
	}

	async sync(): Promise<SyncReport> {
		if (!this.current) {
			throw new Error("Missing current Title in Tachikoma.sync call");
		}
		if (this.syncNotification) {
			this.syncNotification.destroy();
			this.syncNotification = undefined;
		}
		const currentUpdater = this.current;
		this.overlay.setLoading(true);
		await currentUpdater.updater.import();
		const result = await currentUpdater.updater.export();
		this.syncNotification = this.displaySyncReport(result, currentUpdater, true);
		this.overlay.setLoading(false);
		return result;
	}
}

export default new TachikomaClass();
