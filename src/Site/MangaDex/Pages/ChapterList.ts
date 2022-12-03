import { debug, info } from "@Core/Logger";
import Title from "@Core/Title";
import MangaDex from "@Service/MangaDex";
import { ChapterRow, highlight, TitleChapterGroup } from "@Core/Highlight";
import { waitForSelector } from "@Core/Utility";
import { fullChapterFromString, IDFromLink } from "../Utility";
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

// Remove the toggle from a previous page
let toggleHidden: ToggleHidden | undefined;
function cleanupToggle() {
	if (toggleHidden) {
		if ("remove" in toggleHidden.$$.root) {
			toggleHidden.$$.root.remove();
		}
		toggleHidden.$destroy();
		toggleHidden = undefined;
	}
}

async function highlightTitlesChapters() {
	cleanupToggle();

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
				if (
					titleRow.row &&
					titleRow.chapters.every((chapterRow) => chapterRow.row.classList.contains("chapter-state"))
				) {
					titleRow.row.dataset.height = `${titleRow.row.clientHeight}`;
					titleRow.row.classList.add("chapter-transition", "chapter-state", "chapter-hidden");
				}
			})
		);
	}
	await Promise.all(promises);
	const totalHidden = groups.reduce((acc, group) => {
		return (
			acc + group.chapters.reduce((acc, row) => acc + (row.row.classList.contains("chapter-state") ? 1 : 0), 0)
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

async function run() {
	info("Chapter List page");
	cleanupToggle();

	// * Add page listener
	// * Highlight and hide chapters
	const container = document.querySelector(".page-container > div:last-child > div:nth-child(2)");
	if (container) {
		let lastPage: string | null = null;
		let waitingForSelector = false;

		// Add an observer on the page number to reload highlight on page change
		const pageObserver = new MutationObserver((_, observer) => {
			const currentPage = new URLSearchParams(location.search).get("page");
			if (currentPage != lastPage) {
				waitingForSelector = true;
				lastPage = currentPage;
				cleanupToggle();
			}
			if (waitingForSelector && document.querySelector(".chapter-feed__container")) {
				waitingForSelector = false;
				highlightTitlesChapters();
			}
		});
		pageObserver.observe(container, { childList: true, subtree: true });

		// Initial highlight
		waitForSelector(".chapter-feed__container").then(() => {
			highlightTitlesChapters();
		});

		return () => {
			pageObserver.disconnect();
		};
	}
}

export default run;
