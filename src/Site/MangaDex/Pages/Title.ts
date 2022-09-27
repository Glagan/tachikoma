import { debug, info } from "@Core/Logger";
import Tachikoma from "@Core/Tachikoma";
import Title from "@Core/Title";
import MangaDex from "@Service/MangaDex";
import MangaDexAPI from "../API";
import { convertServices, fullChapterFromString, getCover, IDFromLink, waitForSelector } from "../Utility";
import { ChapterRow, highlight } from "../Highlight";

function findMangaDexId(): string | undefined {
	const titleLink = document.querySelector<HTMLAnchorElement>('[to^="/title/"]');
	if (titleLink) {
		return IDFromLink(titleLink.getAttribute("to")!, "title");
	}
	return undefined;
}

export function chapterRows(): ChapterRow[] {
	const rows = document.querySelectorAll<HTMLElement>(".volume-head + div > .bg-accent");
	return Array.from(rows)
		.map((row): ChapterRow | undefined => {
			let progress: Progress | undefined = undefined;
			if (row.childElementCount == 2) {
				const chapterValue = row.firstElementChild?.firstElementChild?.textContent;
				if (chapterValue) {
					progress = fullChapterFromString(chapterValue);
				}
			} else {
				const chapterValue = row.querySelector<HTMLElement>("a[title]")?.getAttribute("title");
				if (chapterValue) {
					progress = fullChapterFromString(chapterValue);
				}
			}
			if (!progress) {
				return undefined;
			}
			row.classList.add("chapter-row");
			return { row, progress };
		})
		.filter((row): row is ChapterRow => row != undefined)
		.reverse();
}

async function waitForChaptersAndHighlight(title: Title) {
	const rows = chapterRows();
	highlight(rows, title);
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
		{ name: informations.attributes.title.en, thumbnail: getCover(informations), services }
	);
	waitForChaptersAndHighlight(title);
	debug("title", title);
	if (title.updateServices(services)) {
		debug("updated services", { services: title.services });
		await title.save();
	}
	Tachikoma.setTitle(title);
	debug("found title", { title });
	// * Initial merge import and export for all services
	const report = await Tachikoma.sync();
	waitForChaptersAndHighlight(title);
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
