import Tachikoma from "@Core/Tachikoma";
import TemporaryLogs from "@Core/TemporaryLogs";
import Title from "@Core/Title";
import MangaDexAPI from "../API";
import { convertServices, IDFromLink } from "../Utility";

function findMangaDexId(): string | null {
	const titleLink = document.querySelector<HTMLAnchorElement>('[to^="/title/"]');
	if (titleLink) {
		return IDFromLink(titleLink.getAttribute("to")!, "title");
	}
	return null;
}

export default async () => {
	// * Wait for required existing node
	if (!document.querySelector('[to^="/title/"]')) {
		console.log("Waiting for the page to load");
		await new Promise((resolve, reject) => {
			setTimeout(() => {
				reject();
			}, 5000);
			const initObserver = new MutationObserver((_, observer) => {
				if (document.querySelector('[to^="/title/"]')) {
					resolve(true);
					observer.disconnect();
				}
			});
			initObserver.observe(document.body, { childList: true, subtree: true });
		});
	}
	// * Handle page
	const mangaDexId = findMangaDexId();
	if (mangaDexId) {
		const informations = await MangaDexAPI.get(mangaDexId);
		console.log("MangaDex informations", informations);
		if (informations) {
			const services = convertServices(informations.attributes.links);
			const title = await Title.getOrCreate(
				"md",
				{ id: informations.id },
				{ name: informations.attributes.title.en, services }
			);
			console.log("title", title);
			if (title.updateServices(services)) {
				TemporaryLogs.debug("updated services", { services: title.services });
				await title.save();
			}
			TemporaryLogs.debug("found title", { title });
			// Set the current updater
			const updater = Tachikoma.setTitle(title);
			const snapshots = await updater.import();
			TemporaryLogs.debug("mergeExternal snapshots", { snapshots });
			TemporaryLogs.debug("updater", { updater });
			updater.title.status = Status.READING;
			updater.title.chapter = 1;
			const report = await updater.sync();
			TemporaryLogs.debug("sync report", { report });
		}
	}
};
