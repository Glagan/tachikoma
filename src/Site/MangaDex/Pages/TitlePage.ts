import Tachikoma from "@Core/Tachikoma";
import Title, { Status } from "@Core/Title";
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
	console.log(
		"%c[tachikoma] Title page",
		["color: #000", "background-color: cyan", "padding: 4px", "border-radius: 2px"].join(";")
	);
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
	console.log("MangaDex informations", informations);
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
	console.log("title", title);
	if (title.updateServices(services)) {
		console.log("updated services", { services: title.services });
		await title.save();
	}
	Tachikoma.setTitle(title, getCover(informations));
	console.log("found title", { title });
	// * Initial merge sync for all services
	const snapshots = await Tachikoma.import();
	console.log("mergeExternal snapshots", { snapshots });
	const report = await Tachikoma.sync();
	console.log("sync report", { report });
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
