import { debug, info } from "@Core/Logger";
import Tachikoma from "@Core/Tachikoma";
import Title from "@Core/Title";
import { waitForSelector } from "@Core/Utility";
import MangaDex from "@Service/MangaDex";
import Reader from "@Core/Reader";
import MangaDexAPI from "../API";
import { fullChapterFromString, IDFromLink } from "../Utility";

function findMangaDexId(): string | undefined {
	const titleLink = document.querySelector<HTMLAnchorElement>('a.text-primary[href^="/title/"]');
	if (titleLink) {
		return IDFromLink(titleLink, "title");
	}
	return undefined;
}

let initialized = false;
export default async function run() {
	info("Chapter page");

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
	if (!initialized) {
		debug("title", title);
		let updated = title.updateRelations(relations);
		if (updated) {
			debug("updated relations", { relations: title.relations });
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

	// * Handle page change
	// Call the Reader state automatically
	const container = document.querySelector<HTMLElement>(".md--progress") ?? undefined;
	let reader: Reader | undefined;
	if (container) {
		reader = new Reader()
			.withChapterState(function () {
				const chapterLink = document.querySelector<HTMLAnchorElement>('a[href^="/chapter/"]');
				if (chapterLink) {
					const trySelectLabels = document.querySelectorAll<HTMLElement>(
						".reader--menu .md-select .transition-label"
					);
					let progress = undefined;
					for (const label of Array.from(trySelectLabels).reverse()) {
						if (label.textContent && label.textContent?.indexOf("Chapter") >= 0) {
							progress = fullChapterFromString(label.nextElementSibling!.textContent!.trim());
							break;
						}
					}
					if (!progress) {
						return undefined;
					}
					return { id: IDFromLink(chapterLink, "chapter"), progress };
				}
				return undefined;
			})
			.withReadingState(function () {
				if (container) {
					let currentPage =
						container.querySelectorAll(".read").length + container.querySelectorAll(".current").length;
					const progress = { current: currentPage, max: 0 };
					// Find the max progress in the last child of the container
					let lastPageContainer = container.lastElementChild!;
					for (const pageBlock of Array.from(lastPageContainer.children)) {
						const pageProgress = parseInt(pageBlock.textContent!);
						if (!isNaN(pageProgress) && pageProgress > progress.max) {
							progress.max = pageProgress;
							break;
						}
					}
					return { lastPage: progress.current == progress.max };
				}
				return undefined;
			})
			.observe(container, { childList: true, subtree: true, attributeFilter: ["class"] });
		reader.start();
	}
	initialized = true;
	return () => {
		if (reader) {
			reader.cleanup();
		}
	};
}
