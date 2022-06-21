import Tachikoma from "@Core/Tachikoma";
import TemporaryLogs from "@Core/TemporaryLogs";
import Title, { Status } from "@Core/Title";
import MangaDex from "@Service/MangaDex";
import MangaDexAPI from "../API";
import { convertServices, getCover, IDFromLink } from "../Utility";

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
			services[MangaDex.key] = { id: informations.id };
			const title = await Title.getOrCreate(
				MangaDex.key,
				{ id: informations.id },
				{ name: informations.attributes.title.en, services }
			);
			console.log("title", title);
			if (title.updateServices(services)) {
				console.log("updated services", { services: title.services });
				await title.save();
			}
			console.log("found title", { title });
			// Set the current updater
			const updater = Tachikoma.setTitle(title, getCover(informations, "small"));
			const snapshots = await Tachikoma.import();
			console.log("mergeExternal snapshots", { snapshots });
			updater.title.status = Status.READING;
			updater.title.chapter = 1;
			const report = await Tachikoma.sync();
			console.log("sync report", { report });
		}
	}
};
