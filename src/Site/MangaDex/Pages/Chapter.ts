import { debug, error, info } from "@Core/Logger";
import { Options } from "@Core/Options";
import Tachikoma from "@Core/Tachikoma";
import Title, { Status } from "@Core/Title";
import MangaDex from "@Service/MangaDex";
import MangaDexAPI from "../API";
import { convertServices, fullChapterFromString, getCover, IDFromLink, waitForSelector } from "../Utility";

type ReaderProgress = {
	current: number;
	max: number;
};

function readingState(container: HTMLElement | null | undefined): ReaderProgress | undefined {
	if (container) {
		let currentPage = container.querySelectorAll(".read").length + 1;
		const doublePage = container.querySelectorAll(".page.active").length > 1;
		if (doublePage) {
			currentPage += 1;
		}
		const progress = { current: currentPage, max: 0 };
		let currentExpectedLastPage: Element | null = container.lastElementChild!;
		while (currentExpectedLastPage) {
			const lastPageProgress = parseInt(currentExpectedLastPage.textContent!);
			if (!isNaN(lastPageProgress)) {
				progress.max = lastPageProgress;
				break;
			}
			currentExpectedLastPage = currentExpectedLastPage.previousElementSibling;
		}
		return progress;
	}
	return undefined;
}

function chapterState() {
	const chapterLink = document.querySelector<HTMLAnchorElement>('a[href^="/chapter/"]');
	if (chapterLink) {
		const chapterContainer = document.querySelector<HTMLElement>("div.grid.grid-cols-3")!;
		const progress = fullChapterFromString(chapterContainer.firstElementChild!.textContent!.trim());
		return { id: IDFromLink(chapterLink, "chapter"), progress };
	}
	return undefined;
}

function findMangaDexId(): string | undefined {
	const titleLink = document.querySelector<HTMLAnchorElement>('a.text-primary[href^="/title/"]');
	if (titleLink) {
		return IDFromLink(titleLink, "title");
	}
	return undefined;
}

function findProgressContainer() {
	return document.querySelector<HTMLElement>(".progress .prog-inner") ?? undefined;
}

let lastChapter: string | undefined;
async function checkAndUpdate(container: HTMLElement) {
	const title = Tachikoma.current?.title;
	if (!title) {
		error("Missing title in updater");
		return;
	}
	const chapter = chapterState();
	if (!chapter) {
		error("Missing chapter informations in reader");
		return;
	}
	const readingProgress = readingState(container);
	if (!readingProgress) {
		error("Missing reading progress in reader");
		return;
	}
	if (
		lastChapter == chapter.id ||
		(Options.values.reading.saveOnLastPage && readingProgress.current != readingProgress.max)
	) {
		return;
	}

	let shouldUpdate = false;
	if (Options.values.reading.saveOnlyNext) {
		shouldUpdate = title.chapterIsNext(chapter.progress);
	} else if (Options.values.reading.saveOnlyHigher) {
		shouldUpdate =
			title.chapter < chapter.progress.chapter ||
			!!(chapter.progress.oneshot && title.status !== Status.COMPLETED);
	} else {
		shouldUpdate = true;
	}
	debug("progress updated", readingProgress);

	if (shouldUpdate) {
		lastChapter = chapter.id;
		// TODO [Option] updateOnlyInList, confirmChapter
		const report = await Tachikoma.setProgress(chapter.progress);
		debug("Tachikoma.setProgress report", report, "for", chapter.progress);
	}
}

let progressObserver: MutationObserver | undefined;
let initialized = false;
export default async () => {
	info("Chapter page");
	if (progressObserver) {
		progressObserver.disconnect();
		progressObserver = undefined;
	}

	// * Wait for required existing node
	await waitForSelector('a.text-primary[href^="/title/"]');
	const mangaDexId = findMangaDexId();
	if (!mangaDexId) {
		return;
	}

	// * Get Title informations
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
	if (!initialized) {
		debug("title", title);
		if (title.updateServices(services)) {
			debug("updated services", { services: title.services });
			await title.save();
		}
	}
	Tachikoma.setTitle(title);
	debug("found title", { title });

	// * Initial merge import for all services
	// * No export is done here -- the next checkAndUpdate will sync (to avoid double sync + setProgress)
	if (!initialized) {
		const snapshots = await Tachikoma.import();
		debug("mergeExternal snapshots", { snapshots });
	}

	// * Check chapter state
	const chapter = chapterState();
	if (!chapter) {
		debug("no chapter state");
		// If there is no chapter state, still export the title if needed after an import
		const report = await Tachikoma.export();
		debug("sync report", { report });
		return;
	}
	debug("chapter state", chapter);

	// * Handle page change
	const container = findProgressContainer();
	if (container) {
		if (!initialized) {
			initialized = true;
			checkAndUpdate(container);
		}
		progressObserver = new MutationObserver((mutations, observer) => {
			checkAndUpdate(container);
		});
		progressObserver.observe(container, { childList: true, subtree: true, attributeFilter: ["class"] });
	} else {
		initialized = true;
	}
};
