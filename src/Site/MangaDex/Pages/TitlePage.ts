import { debug, info } from "@Core/Logger";
import Tachikoma from "@Core/Tachikoma";
import Title, { Status } from "@Core/Title";
import { Options } from "@Core/Options";
import MangaDex from "@Service/MangaDex";
import MangaDexAPI from "../API";
import { convertServices, fullChapterFromString, getCover, IDFromLink, waitForSelector } from "../Utility";

function findMangaDexId(): string | undefined {
	const titleLink = document.querySelector<HTMLAnchorElement>('[to^="/title/"]');
	if (titleLink) {
		return IDFromLink(titleLink.getAttribute("to")!, "title");
	}
	return undefined;
}

type ChapterRow = {
	row: HTMLElement;
	progress: Progress;
};

function chapterRows(): ChapterRow[] {
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
			return { row, progress } as ChapterRow;
		})
		.filter((row): row is ChapterRow => row != undefined)
		.reverse();
}

enum ProgressState {
	Higher,
	NextChapter,
	Current,
	InList,
	Lower,
}

function isNext(title: Title, progress: Progress) {
	return (
		// Next from chapter (progress < current + 2) to handle sub-chapters
		(progress.chapter > title.chapter && progress.chapter < Math.floor(title.chapter) + 2) ||
		// Next from volume (progress == current + 1) if progress has no chapter
		(progress.chapter < 0 &&
			progress.volume !== undefined &&
			title.volume !== undefined &&
			progress.volume == title.volume + 1) ||
		// First chapter if not completed (Oneshot)
		(progress.chapter == 0 && title.chapter == 0 && title.status !== Status.COMPLETED)
	);
}

function chapterProgressState(title: Title, progress: Progress): ProgressState {
	const titleChapter = Math.floor(title.chapter),
		progressChapter = Math.floor(progress.chapter);
	if (progress.chapter > title.chapter) {
		if (isNext(title, progress)) {
			return ProgressState.NextChapter;
		}
		return ProgressState.Higher;
	} else if (titleChapter == progressChapter) {
		return ProgressState.Current;
	}
	return ProgressState.Lower;
}

function highlight(rows: ChapterRow[], title: Title) {
	debug("Highlight enabled ?", Options.values.colors.enabled);
	if (!Options.values.colors.enabled) {
		return;
	}
	let colors = Options.values.colors.highlights;
	let currentColor = 0;
	debug("Highlight rows", rows, "using colors", colors);
	let highlightedNext = false;
	for (const chapterRow of rows) {
		const state = chapterProgressState(title, chapterRow.progress);
		chapterRow.row.style.backgroundColor = "";
		if (state == ProgressState.NextChapter && !highlightedNext) {
			// Chapters are in reverse order -- if a next chapter is found it will be the real next chapter
			chapterRow.row.style.backgroundColor = Options.values.colors.nextChapter;
			highlightedNext = true;
		} else if (state == ProgressState.Higher) {
			chapterRow.row.style.backgroundColor = Options.values.colors.higherChapter;
		} else if (state == ProgressState.Current) {
			chapterRow.row.style.backgroundColor = colors[currentColor];
			currentColor = (currentColor + 1) % colors.length;
		} else if (state == ProgressState.InList) {
			chapterRow.row.style.backgroundColor = Options.values.colors.openedChapter;
		} else if (state == ProgressState.Lower) {
			chapterRow.row.style.backgroundColor = Options.values.colors.lowerChapter;
		}
	}
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
