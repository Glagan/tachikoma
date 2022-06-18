import TemporaryLogs from "@Core/TemporaryLogs";
import Title from "@Core/Title";
import Updater from "@Core/Updater";
import { Overlay } from "@Overlay";
import MangaDex from "@Service/MangaDex";
import { convertServices, IDFromLink } from "../Utility";

type TitlePageInformations = {
	mangadexId: { id: string };
	name?: string;
	cover?: string;
	publicationStatus?: PublicationStatus;
	services: ServiceList;
};

function getInformations(): TitlePageInformations {
	const titleLink = document.querySelector<HTMLAnchorElement>('[to^="/title/"]')!;
	const mangadexId = { id: IDFromLink(titleLink.getAttribute("to")!, "title") };
	const coverImg = titleLink.querySelector<HTMLImageElement>("img.max-h-full");
	const cover = coverImg?.src;
	const titleBlock = document.querySelector("div.title > *:not(:empty)");
	const name = titleBlock?.textContent!.trim();
	let publicationStatus: PublicationStatus | undefined = undefined;
	// TODO Fix status
	/*const statusLabel = document.querySelector<HTMLElement>('[style="grid-area: stats;"] .tag.dot');
	if (statusLabel) {
		publicationStatus = (statusLabel.textContent ?? undefined)
			?.trim()
			.replace(/\s*publication:\s+/i, "")
			.toLocaleLowerCase() as PublicationStatus;
	}*/
	const serviceLinks: MangaDexServiceLink[] = [];
	const sidebar = document.getElementById(mangadexId.id);
	if (sidebar) {
		for (const child_ of sidebar.children) {
			const child = child_ as HTMLElement;
			if (child.firstElementChild && child.firstElementChild.textContent!.trim() == "Track") {
				const allLinks = child.querySelectorAll<HTMLAnchorElement>('a[href^="http"]');
				for (const link of allLinks) {
					const name = link.textContent!.trim();
					serviceLinks.push({ name, url: link.href });
				}
			}
		}
	} else console.error("No sidebar");
	return { mangadexId, name, cover, publicationStatus, services: convertServices(serviceLinks) };
}

export default async () => {
	Overlay.create();
	// * Wait for required existing node
	if (!document.querySelector('[to^="/title/"]')) {
		console.log("Waiting for the page to load");
		await new Promise((resolve, reject) => {
			setTimeout(() => {
				reject();
			}, 5000);
			const initObserver = new MutationObserver((mutations, observer) => {
				if (document.querySelector('[to^="/title/"]')) {
					resolve(true);
					observer.disconnect();
				}
			});
			initObserver.observe(document.body, { childList: true, subtree: true });
		});
	}
	// * Handle page
	const informations = getInformations();
	// Load Title
	TemporaryLogs.debug("found informations", { informations });
	const title = await Title.getOrCreate("md", informations.mangadexId, {
		name: informations.name,
		services: { ...informations.services, [MangaDex.key]: informations.mangadexId },
	});
	if (title.updateServices(informations.services)) {
		TemporaryLogs.debug("updated services", { services: title.services });
		await title.save();
	}
	TemporaryLogs.debug("found title", { title });
	// Update from services and sync
	const updater = new Updater(title);
	const snapshots = await updater.import();
	TemporaryLogs.debug("mergeExternal snapshots", { snapshots });
	TemporaryLogs.debug("updater", { updater });
	updater.title.status = Status.READING;
	updater.title.chapter += 1;
	const report = await updater.sync();
	TemporaryLogs.debug("sync report", { report });
	Overlay.setTitle(title);
};
