import { debug } from "@Core/Logger";
import { Options } from "@Core/Options";
import type Title from "@Core/Title";
import { Status } from "@Core/Title";

export type TitleRow = {
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

export function isNext(title: Title, progress: Progress) {
	return (
		// Next from chapter (progress < current + 2) to handle sub-chapters
		(progress.chapter > title.chapter && progress.chapter < Math.floor(title.chapter) + 2) ||
		// Next from volume (progress == current + 1) if progress has no chapter
		(progress.chapter < 0 &&
			progress.volume !== undefined &&
			title.volume !== undefined &&
			progress.volume == title.volume + 1) ||
		// First chapter if not completed (Oneshot)
		(progress.chapter == 0 && title.chapter == 0 && title.status !== Status.COMPLETED)
	);
}

export function chapterProgressState(title: Title, progress: Progress): ProgressState {
	const titleChapter = Math.floor(title.chapter),
		progressChapter = Math.floor(progress.chapter);
	if (progress.chapter > title.chapter) {
		if (isNext(title, progress)) {
			return ProgressState.NextChapter;
		}
		return ProgressState.Higher;
	} else if (titleChapter == progressChapter) {
		return ProgressState.Current;
	}
	return ProgressState.Lower;
}

export function highlight(rows: ChapterRow[], title: Title) {
	debug("Highlight enabled ?", Options.values.colors.enabled);
	if (!Options.values.colors.enabled) {
		return;
	}
	let colors = Options.values.colors.highlights;
	let currentColor = 0;
	debug("Highlight rows", rows, "using colors", colors);
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
		} else if (state == ProgressState.Current) {
			chapterRow.row.style.backgroundColor = colors[currentColor];
			currentColor = (currentColor + 1) % colors.length;
		} else if (state == ProgressState.InList) {
			chapterRow.row.style.backgroundColor = Options.values.colors.openedChapter;
		} else if (state == ProgressState.Lower) {
			chapterRow.row.style.backgroundColor = Options.values.colors.lowerChapter;
		}
	}
}
