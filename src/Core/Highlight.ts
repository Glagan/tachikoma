import { debug } from "@Core/Logger";
import { Options } from "@Core/Options";
import type Title from "@Core/Title";

export type TitleChapterGroup = {
	row: HTMLElement;
	title: Promise<Title | null>;
	chapters: ChapterRow[];
};

export type ChapterRow = {
	row: HTMLElement;
	progress: Progress;
};

export enum ProgressState {
	Higher,
	NextChapter,
	Current,
	InList,
	Lower,
}

export function chapterProgressState(title: Title, progress: Progress): ProgressState {
	const titleChapter = Math.floor(title.chapter),
		progressChapter = Math.floor(progress.chapter);
	if (progress.chapter > title.chapter) {
		if (title.chapterIsNext(progress)) {
			return ProgressState.NextChapter;
		}
		return ProgressState.Higher;
	} else if (titleChapter == progressChapter) {
		return ProgressState.Current;
	}
	return ProgressState.Lower;
}

let colors = Options.values.colors.highlights;
let currentColor = 0;
export function highlight(rows: ChapterRow[], title: Title, hide?: boolean) {
	debug("Highlight enabled ?", Options.values.colors.enabled);
	if (!Options.values.colors.enabled) {
		return;
	}
	debug("Highlight rows", rows, "using colors", colors, "continue at", currentColor);
	let highlightedNext = false;
	for (const chapterRow of rows) {
		const state = chapterProgressState(title, chapterRow.progress);
		chapterRow.row.style.backgroundColor = "";
		if (state == ProgressState.NextChapter && !highlightedNext) {
			// Chapters are in reverse order -- if a next chapter is found it will be the real next chapter
			chapterRow.row.style.backgroundColor = Options.values.colors.nextChapter;
			highlightedNext = true;
		} else if (state == ProgressState.Higher) {
			chapterRow.row.style.backgroundColor = Options.values.colors.higherChapter;
			if (hide && Options.values.lists.hideHigher) {
				chapterRow.row.dataset.height = `${chapterRow.row.clientHeight}`;
				chapterRow.row.classList.add("chapter-transition", "chapter-state", "chapter-hidden");
			}
		} else if (state == ProgressState.Current) {
			chapterRow.row.style.backgroundColor = colors[currentColor];
			currentColor = (currentColor + 1) % colors.length;
			if (hide && Options.values.lists.hideLast) {
				chapterRow.row.dataset.height = `${chapterRow.row.clientHeight}`;
				chapterRow.row.classList.add("chapter-transition", "chapter-state", "chapter-hidden");
			}
		} else if (state == ProgressState.InList) {
			chapterRow.row.style.backgroundColor = Options.values.colors.openedChapter;
		} else if (state == ProgressState.Lower) {
			chapterRow.row.style.backgroundColor = Options.values.colors.lowerChapter;
			if (hide && Options.values.lists.hideHigher) {
				chapterRow.row.dataset.height = `${chapterRow.row.clientHeight}`;
				chapterRow.row.classList.add("chapter-transition", "chapter-state", "chapter-hidden");
			}
		}
	}
}
