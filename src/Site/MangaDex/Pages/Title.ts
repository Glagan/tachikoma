import { debug, info } from "@Core/Logger";
import Tachikoma from "@Core/Tachikoma";
import Title from "@Core/Title";
import MangaDex from "@Service/MangaDex";
import { ChapterRow, highlight } from "@Core/Highlight";
import { waitForSelector } from "@Core/Utility";
import MangaDexAPI from "../API";
import { fullChapterFromString, IDFromLink } from "../Utility";

function findMangaDexId(): string | undefined {
	const titleLink = document.querySelector<HTMLAnchorElement>('[to^="/title/"]');
	if (titleLink) {
		return IDFromLink(titleLink.getAttribute("to")!, "title");
	}
	return undefined;
}

const chapterSelector = ".volume-head + div > .bg-accent";
export function chapterRows(): ChapterRow[] {
	const rows = document.querySelectorAll<HTMLElement>(chapterSelector);
	return Array.from(rows)
		.map((row): ChapterRow | undefined => {
			let progress: Progress | undefined = undefined;
			if (row.childElementCount == 2) {
				const chapterValue = row.firstElementChild?.querySelector("span")?.textContent;
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

async function waitAndHighlightRows(title: Title) {
	try {
		await waitForSelector(chapterSelector);
		const rows = chapterRows();
		if (rows.length > 0) {
			highlight(rows, title);
		}
	} catch (error) {
		// Ignore errors, Network Error or no chapters
	}
}

async function run() {
	info("Title page");

	// * Wait for required existing node
	await waitForSelector('.manga-container [to^="/title/"]');

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
	const relations = MangaDex.extractRelations(informations.attributes.links);
	relations[MangaDex.key] = { id: informations.id };
	const title = await Title.getOrCreate(
		MangaDex.key,
		{ id: informations.id },
		{
			name: informations.attributes.title.en,
			thumbnail: MangaDex.extractCover(informations),
			relations,
		}
	);
	waitAndHighlightRows(title);
	debug("title", title);
	const updated = title.updateRelations(relations);
	if (updated) {
		debug("updated relations", { relations: title.relations });
		await title.save();
	}
	const updater = Tachikoma.setTitle(title);
	updater.addListener((title) => {
		waitAndHighlightRows(title);
	});

	debug("found title", { title });

	// * Initial merge import and export for all services
	const report = await Tachikoma.sync();
	waitAndHighlightRows(title);
	debug("sync report", { report });

	// * Handle title page change
	let lastId: string | undefined;
	const randomObserver = new MutationObserver((_, observer) => {
		if (location.pathname.startsWith("/title/") && document.querySelector('[to^="/title/"]')) {
			const currentId = findMangaDexId();
			if (!lastId) lastId = currentId;
			else if (lastId != currentId) {
				lastId = currentId;
				Tachikoma.clearTitle();
				run();
			}
		} else {
			randomObserver.disconnect();
		}
	});
	randomObserver.observe(document.body, { childList: true, subtree: true });

	// * Handle page change (update highlight)
	const chapterColumnSelector = `div[id^='${informations.id}']`;
	let pageObserver: undefined | MutationObserver;
	waitForSelector(chapterColumnSelector).then(() => {
		const chapterColumn = document.querySelector(chapterColumnSelector);
		if (chapterColumn) {
			let lastPage: string | null = null;
			let waitingForSelector = false;
			pageObserver = new MutationObserver((_, observer) => {
				if (!location.pathname.startsWith("/title/")) {
					return;
				}
				const currentPage = new URLSearchParams(location.search).get("page");
				if (currentPage != lastPage) {
					waitingForSelector = true;
					lastPage = currentPage;
				}
				if (waitingForSelector) {
					if (document.querySelector(chapterSelector)) {
						waitingForSelector = false;
						waitAndHighlightRows(title);
					}
				}
			});
			pageObserver.observe(chapterColumn.nextElementSibling!, { childList: true, subtree: true });
		}
	});

	return () => {
		randomObserver.disconnect();
		pageObserver?.disconnect();
	};
}

export default run;
