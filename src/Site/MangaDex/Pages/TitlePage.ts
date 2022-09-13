import { debug, info } from "@Core/Logger";
import Tachikoma from "@Core/Tachikoma";
import Title from "@Core/Title";
import MangaDex from "@Service/MangaDex";
import MangaDexAPI from "../API";
import { convertServices, getCover, IDFromLink, waitForSelector } from "../Utility";

function findMangaDexId(): string | undefined {
	const titleLink = document.querySelector<HTMLAnchorElement>('[to^="/title/"]');
	if (titleLink) {
		return IDFromLink(titleLink.getAttribute("to")!, "title");
	}
	return undefined;
}

let randomObserver: MutationObserver | undefined;
async function run() {
	info("Title page");
	if (randomObserver) {
		randomObserver.disconnect();
		randomObserver = undefined;
	}
	// * Wait for required existing node
	await waitForSelector('[to^="/title/"]');
	// * Handle page
	const mangaDexId = findMangaDexId();
	if (!mangaDexId) {
		return;
	}
	const informations = await MangaDexAPI.get(mangaDexId);
	debug("MangaDex informations", informations);
	if (!informations) {
		return;
	}
	const services = convertServices(informations.attributes.links);
	services[MangaDex.key] = { id: informations.id };
	const title = await Title.getOrCreate(
		MangaDex.key,
		{ id: informations.id },
		{ name: informations.attributes.title.en, services }
	);
	debug("title", title);
	if (title.updateServices(services)) {
		debug("updated services", { services: title.services });
		await title.save();
	}
	Tachikoma.setTitle(title, getCover(informations));
	debug("found title", { title });
	// * Initial merge sync for all services
	const snapshots = await Tachikoma.import();
	debug("mergeExternal snapshots", { snapshots });
	const report = await Tachikoma.sync();
	debug("sync report", { report });
	// * Handle title page change
	let lastId: string | undefined;
	randomObserver = new MutationObserver((_, observer) => {
		if (document.querySelector('[to^="/title/"]')) {
			const currentId = findMangaDexId();
			if (!lastId) lastId = currentId;
			else if (lastId != currentId) {
				lastId = currentId;
				Tachikoma.clearTitle();
				run();
			}
		}
	});
	randomObserver.observe(document.body, { childList: true, subtree: true });
}

export default run;
