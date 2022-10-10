import { ChapterRow, highlight } from "@Core/Highlight";
import { debug, error, info } from "@Core/Logger";
import Tachikoma from "@Core/Tachikoma";
import Title from "@Core/Title";
import { waitForSelector } from "@Core/Utility";
import MangaPlusKey from "../key";

function findMangaPlusId(): number | undefined {
	const imageLink = document.querySelector<HTMLImageElement>('[class^="TitleDetailHeader-module_coverImage"');
	if (imageLink) {
		const href = imageLink.getAttribute("src") ?? "";
		const match = href.match(/\/drm\/title\/(\d+)\/?/);
		if (match) {
			return parseInt(match[1]);
		}
	}
	return undefined;
}

export function chapterRows(): ChapterRow[] {
	const rows = document.querySelectorAll<HTMLElement>('div[class^="ChapterListItem-module_chapterListItem"]');
	return Array.from(rows)
		.map((row): ChapterRow | undefined => {
			const chapterValue = row.querySelector('p[class^="ChapterListItem-module_name"]')?.textContent;
			if (chapterValue) {
				const progress = parseInt(chapterValue.slice(1));
				if (!progress || isNaN(progress)) {
					return undefined;
				}
				row.classList.add("chapter-row");
				return { row, progress: { chapter: progress, volume: undefined, oneshot: false } };
			}
			return undefined;
		})
		.filter((row): row is ChapterRow => row != undefined)
		.reverse();
}

async function highlightRows(title: Title) {
	const rows = chapterRows();
	highlight(rows, title);
}

async function run() {
	info("Title page");

	// * Handle page
	await waitForSelector('[class^="TitleDetailHeader-module_coverImage"');
	const id = findMangaPlusId();
	if (!id) {
		error("id not found");
		return;
	}
	const informations = {
		name: document.querySelector('[class^="TitleDetailHeader-module_title"')?.textContent ?? undefined,
		thumbnail:
			document.querySelector('[class^="TitleDetailHeader-module_coverImage"')?.getAttribute("src") ?? undefined,
	};
	const title = await Title.getOrCreate(
		MangaPlusKey,
		{ id },
		{ name: informations.name, thumbnail: informations.thumbnail, sites: { [MangaPlusKey]: { id } } }
	);
	highlightRows(title);
	debug("title", title);

	// * Updater
	const updater = Tachikoma.setTitle(title);
	updater.addListener((title) => {
		highlightRows(title);
	});

	debug("found title", { title });

	// * Initial merge import and export for all services
	const report = await Tachikoma.sync();
	highlightRows(title);
	debug("sync report", { report });
}

export default run;
