import { debug, info } from "@Core/Logger";
import Title from "@Core/Title";
import MangaDex from "@Service/MangaDex";
import { fullChapterFromString, IDFromLink, waitForSelector } from "../Utility";
import { ChapterRow, highlight, TitleRow } from "../Highlight";

export function titleRows(): TitleRow[] {
	const rows = document.querySelectorAll<HTMLElement>(".chapter-feed__container");
	return Array.from(rows)
		.map((row): TitleRow | undefined => {
			const titleLink = row.querySelector<HTMLElement>("a[href^='/title']");
			if (!titleLink) {
				return undefined;
			}
			const identifier = IDFromLink(titleLink.getAttribute("href")!, "title");
			const title = Title.get(MangaDex.key, { id: identifier });
			const chapters = row.querySelectorAll<HTMLElement>(".chapter[title]");
			return {
				row,
				title,
				chapters: Array.from(chapters)
					.map((row): ChapterRow | undefined => {
						let progress = fullChapterFromString(row.getAttribute("title")!);
						if (!progress) {
							return undefined;
						}
						row.classList.add("chapter-row");
						return { row, progress };
					})
					.filter((row): row is ChapterRow => row != undefined)
					.reverse(),
			};
		})
		.filter((row): row is TitleRow => row != undefined);
}

async function highlightTitlesChapters() {
	const rows = titleRows();
	debug("Highlight title rows", rows);
	for (const titleRow of rows) {
		(async (titleRow) => {
			const title = await titleRow.title;
			if (!title) {
				return;
			}
			highlight(titleRow.chapters, title);
		})(titleRow);
	}
}

async function run() {
	info("Chapter List page");
	// * Only highlight in lists
	await waitForSelector(".chapter-feed__container", 5000);
	highlightTitlesChapters();
}

export default run;
