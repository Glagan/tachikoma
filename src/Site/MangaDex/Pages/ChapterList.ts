import { debug, info } from "@Core/Logger";
import Title from "@Core/Title";
import MangaDex from "@Service/MangaDex";
import { fullChapterFromString, IDFromLink, waitForSelector } from "../Utility";
import { ChapterRow, highlight, TitleChapterGroup } from "../Highlight";
import ToggleHidden from "../ToggleHidden.svelte";

export function titleGroups(): TitleChapterGroup[] {
	const rows = document.querySelectorAll<HTMLElement>(".chapter-feed__container");
	return Array.from(rows)
		.map((row): TitleChapterGroup | undefined => {
			const titleLink = row.querySelector<HTMLElement>("a[href^='/title']");
			if (!titleLink) {
				return undefined;
			}
			const identifier = IDFromLink(titleLink.getAttribute("href")!, "title");
			const title = Title.get(MangaDex.key, { id: identifier });
			const chapters = row.querySelectorAll<HTMLElement>(".chapter[title]");
			return {
				wrapper: row.parentElement,
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
		.filter((row): row is TitleChapterGroup => row != undefined);
}

async function highlightTitlesChapters() {
	const groups = titleGroups();
	debug("Highlight title groups", groups);
	let promises: Promise<unknown>[] = [];
	for (const titleRow of groups) {
		promises.push(
			titleRow.title.then((title) => {
				if (!title) {
					return;
				}
				highlight(titleRow.chapters, title, true);
				if (titleRow.chapters.every((chapterRow) => chapterRow.row.classList.contains("chapter-hidden"))) {
					titleRow.wrapper?.classList.add("chapter-hidden");
				}
			})
		);
	}
	await Promise.all(promises);
	return groups;
}

let toggleHidden: ToggleHidden | undefined;
async function run() {
	info("Chapter List page");
	// * Only highlight in lists
	await waitForSelector(".chapter-feed__container", 5000);
	const groups = await highlightTitlesChapters();
	const totalHidden = groups.reduce((acc, group) => {
		return (
			acc + group.chapters.reduce((acc, row) => acc + (row.row.classList.contains("chapter-hidden") ? 1 : 0), 0)
		);
	}, 0);
	if (totalHidden > 0) {
		const target = document.querySelector(".controls")?.parentElement;
		if (target) {
			const wrapper = document.createElement("div");
			target.insertBefore(wrapper, target.firstElementChild);
			toggleHidden = new ToggleHidden({ target: wrapper, props: { amount: totalHidden } });
		}
	}
}

export default run;
