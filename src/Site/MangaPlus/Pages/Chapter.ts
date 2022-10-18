import { debug, error, info } from "@Core/Logger";
import { Options } from "@Core/Options";
import Reader from "@Core/Reader";
import Tachikoma from "@Core/Tachikoma";
import Title, { Status } from "@Core/Title";
import { waitForSelector } from "@Core/Utility";
import MangaPlusKey from "../key";
import { chapterFromString, IDfromString } from "../Utility";

function getXTranslation(node: HTMLElement) {
	const tranform = new DOMMatrix(node.style.transform);
	return Math.abs(tranform.e);
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
		{ name: informations.name, relations: { [MangaPlusKey]: { id } } }
	);
	Tachikoma.setTitle(title);
	debug("found title", { title });

	// * Initial merge import for all services
	// * No export is done here -- the next checkAndUpdate will sync (to avoid double sync + setProgress)
	if (!initialized) {
		const snapshots = await Tachikoma.import();
		debug("mergeExternal snapshots", { snapshots });
	}

	// * Handle page change
	// Listen on the slider flex-basis style update
	const slider = document.querySelector(".zao-slider-bar-previous");
	if (slider) {
		new Reader()
			.withChapterState(function () {
				const id = document.querySelector<HTMLAnchorElement>(
					'[class^="Navigation-module_chapterTitle"]'
				)?.textContent;
				const chapter = chapterFromString(id);
				if (id && chapter) {
					return { id, progress: { chapter, volume: undefined, oneshot: false } };
				}
				return undefined;
			})
			// No direct page number is available on the page
			// We need to get the current 3d translation x value
			// And compare it against the last page container that has an image in it (exluding the end cards)
			.withReadingState(function () {
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
			})
			.observe(slider, { childList: false, subtree: false, attributeFilter: ["style"] })
			.start();
	}
	initialized = true;
};
