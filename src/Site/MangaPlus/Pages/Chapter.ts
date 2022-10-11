import { debug, error, info } from "@Core/Logger";
import { Options } from "@Core/Options";
import Tachikoma from "@Core/Tachikoma";
import Title, { Status } from "@Core/Title";
import { waitForSelector } from "@Core/Utility";
import MangaPlusKey from "../key";
import { chapterFromString, IDfromString } from "../Utility";

type ReaderProgress = {
	lastPage: boolean;
};

function getXTranslation(node: HTMLElement) {
	const tranform = new DOMMatrix(node.style.transform);
	return Math.abs(tranform.e);
}

// No direct page number is available on the page
// We need to get the current 3d translation x value
// And compare it against the last page container that has an image in it (exluding the end cards)
function readingState(): ReaderProgress | undefined {
	const progress = { lastPage: false };

	const surface = document.querySelector<HTMLElement>(".zao-surface");
	if (!surface) {
		return progress;
	}
	const currentX = getXTranslation(surface);

	const containers = Array.from(document.querySelectorAll<HTMLElement>("div.zao-container")).reverse();
	if (containers.length > 0) {
		let lastPageContainer: HTMLElement | undefined;
		for (const container of containers) {
			if (container.querySelector<HTMLElement>(".zao-image-container")) {
				lastPageContainer = container;
				break;
			}
		}
		if (lastPageContainer) {
			const lastXTranslation = getXTranslation(lastPageContainer);
			if (currentX >= lastXTranslation) {
				progress.lastPage = true;
			}
		}
	}
	return progress;
}

function chapterState() {
	const id = document.querySelector<HTMLAnchorElement>('[class^="Navigation-module_chapterTitle"]')?.textContent;
	const chapter = chapterFromString(id);
	if (id && chapter) {
		return { id, progress: { chapter, volume: undefined, oneshot: false } };
	}
	return undefined;
}

let lastChapter: string | undefined;
async function checkAndUpdate() {
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
	const readingProgress = readingState();
	if (!readingProgress) {
		error("Missing reading progress in reader");
		return;
	}

	if (lastChapter == chapter.id || (Options.values.reading.saveOnLastPage && !readingProgress.lastPage)) {
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

	if (shouldUpdate) {
		lastChapter = chapter.id;
		// TODO [Option] updateOnlyInList, confirmChapter
		const report = await Tachikoma.setProgress(chapter.progress);
		debug("Tachikoma.setProgress report", report, "for", chapter.progress);
	}
}

const idSelector = 'a[href^="/titles/"]';
function findMangaPlusId(): number | undefined {
	return IDfromString(document.querySelector<HTMLAnchorElement>(idSelector)?.getAttribute("href"));
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
	await waitForSelector(idSelector);
	const id = findMangaPlusId();
	if (!id) {
		debug("Title ID not found on the page");
		return;
	}

	// * Get Title informations
	const informations = {
		name: document.querySelector('[class^="TitleDetailHeader-module_title"')?.textContent ?? undefined,
	};
	const title = await Title.getOrCreate(
		MangaPlusKey,
		{ id },
		{ name: informations.name, sites: { [MangaPlusKey]: { id } } }
	);
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
	// Listen on the slider flex-basis style update
	const slider = document.querySelector(".zao-slider-bar-previous");
	if (slider) {
		if (!initialized) {
			initialized = true;
			checkAndUpdate();
		}
		progressObserver = new MutationObserver((mutations, observer) => {
			checkAndUpdate();
		});
		progressObserver.observe(slider, { childList: false, subtree: false, attributeFilter: ["style"] });
	} else {
		initialized = true;
	}
};
