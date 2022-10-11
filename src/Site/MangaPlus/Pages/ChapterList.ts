import { debug, info } from "@Core/Logger";
import Title from "@Core/Title";
import { highlight, TitleChapterGroup } from "@Core/Highlight";
import { waitForSelector } from "@Core/Utility";
import ToggleHidden from "../ToggleHidden.svelte";
import MangaPlusKey from "../key";
import { chapterFromString, IDfromString } from "../Utility";

export function titlesChapter(): TitleChapterGroup[] {
	const cards = document.querySelectorAll<HTMLElement>('[class^="UpdatedTitle-module_titleWrapper"]');
	return Array.from(cards)
		.map((row): TitleChapterGroup | undefined => {
			const titleLink = row.querySelector<HTMLElement>('a[href^="/titles/"]');
			if (!titleLink) {
				return undefined;
			}
			const id = IDfromString(titleLink.getAttribute("href"));
			if (!id) {
				return undefined;
			}
			const chapter = chapterFromString(
				row.querySelector('[class^="UpdatedTitle-module_chapterTitle_"]')?.textContent
			);
			if (!chapter || isNaN(chapter)) {
				return undefined;
			}
			const title = Title.get(MangaPlusKey, { id });
			row.classList.add("chapter-row");
			row.style.borderRadius = "0 0 10px 10px";
			return {
				row,
				title,
				chapters: [
					{
						row,
						progress: { chapter, volume: undefined, oneshot: false },
					},
				],
			};
		})
		.filter((row): row is TitleChapterGroup => row != undefined);
}

const toggleWrapperId = "tachikoma-chapter-toggle";

async function highlightTitlesChapter() {
	const cards = titlesChapter();
	debug("Highlight title cards", cards);
	let promises: Promise<unknown>[] = [];
	for (const card of cards) {
		promises.push(
			card.title.then((title) => {
				if (!title) {
					return;
				}
				highlight(card.chapters, title, true);
				if (card.row && card.row.classList.contains("chapter-state")) {
					card.row.dataset.height = `${card.row.clientHeight}`;
					card.row.classList.add("chapter-transition", "chapter-state", "chapter-hidden");
				}
			})
		);
	}
	await Promise.all(promises);
	const totalHidden = cards.reduce((acc, group) => {
		return acc + (group.chapters[0].row.classList.contains("chapter-state") ? 1 : 0);
	}, 0);
	if (totalHidden > 0) {
		const target = document.getElementById(toggleWrapperId);
		if (target) {
			new ToggleHidden({ target, props: { amount: totalHidden } });
		}
	}
}

async function run() {
	info("Chapter List page");
	await waitForSelector('[class^="UpdatedTitle-module_titleWrapper"]');

	// * Create the toggle container
	const toggle = document.getElementById(toggleWrapperId);
	if (!toggle) {
		const dailyTitle = document.querySelector<HTMLElement>('[class^="Updates-module_dailyTitle"]');
		if (dailyTitle) {
			let wrapper = document.createElement("div");
			wrapper.id = toggleWrapperId;
			wrapper.style.display = "inline-flex";
			wrapper.style.marginLeft = "8px";
			dailyTitle.appendChild(wrapper);
		}
	}

	// * Highlight and hide chapters
	highlightTitlesChapter();
}

export default run;
