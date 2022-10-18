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
export default async () => {
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
	const container = document.querySelector<HTMLElement>(".progress .prog-inner") ?? undefined;
	if (container) {
		new Reader()
			.withChapterState(function () {
				const chapterLink = document.querySelector<HTMLAnchorElement>('a[href^="/chapter/"]');
				if (chapterLink) {
					const chapterContainer = document.querySelector<HTMLElement>("div.grid.grid-cols-3")!;
					const progress = fullChapterFromString(chapterContainer.firstElementChild!.textContent!.trim());
					return { id: IDFromLink(chapterLink, "chapter"), progress };
				}
				return undefined;
			})
			.withReadingState(function () {
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
					return { lastPage: progress.current == progress.max };
				}
				return undefined;
			})
			.observe(container, { childList: true, subtree: true, attributeFilter: ["class"] })
			.start();
	}
	initialized = true;
};
