import { debug, error } from "./Logger";
import { Options } from "./Options";
import Tachikoma from "./Tachikoma";
import { Status } from "./Title";

export type ReadingState = {
	lastPage: boolean;
};

export type ChapterState = {
	id: number | string;
	progress: Progress;
};

export default class Reader<T extends {} | undefined = undefined> {
	data: T;
	private getChapterState?: () => ChapterState | undefined;
	private getReadingState?: () => ReadingState | undefined;
	lastChapter?: number | string;
	initialized: boolean;
	observer?: MutationObserver;
	observerOptions?: { target: Node; options?: MutationObserverInit | undefined };

	constructor(data?: T) {
		if (data) {
			this.data = data;
		} else {
			this.data = {} as T;
		}
		this.initialized = false;
	}

	protected cleanup() {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = undefined;
		}
	}

	withChapterState(callback: (this: this) => ChapterState | undefined) {
		this.getChapterState = callback;
		return this;
	}

	get chapterState(): ChapterState | undefined {
		if (this.getChapterState) {
			return this.getChapterState();
		}
		return undefined;
	}

	withReadingState(callback: (this: this) => ReadingState | undefined) {
		this.getReadingState = callback;
		return this;
	}

	get readingState(): ReadingState | undefined {
		if (this.getReadingState) {
			return this.getReadingState();
		}
		return undefined;
	}

	async checkAndUpdate() {
		const title = Tachikoma.current?.title;
		if (!title) {
			debug("Missing title in updater (chapter changed?)");
			return this.cleanup();
		}

		const chapter = this.getChapterState?.();
		if (!chapter) {
			error("Missing chapter informations in reader");
			return this.cleanup();
		}

		const readingProgress = this.getReadingState?.();
		if (!readingProgress) {
			error("Missing reading progress in reader");
			return this.cleanup();
		}

		if (this.lastChapter == chapter.id || (Options.values.reading.saveOnLastPage && !readingProgress.lastPage)) {
			return;
		}

		let shouldUpdate = false;
		if (Options.values.reading.saveOnlyNext) {
			shouldUpdate = title.chapterIsNext(chapter.progress);
		} else if (Options.values.reading.saveOnlyHigher) {
			shouldUpdate =
				title.chapter < chapter.progress.chapter ||
				!!(chapter.progress.oneshot && title.status !== Status.COMPLETED);
		} else {
			shouldUpdate = true;
		}
		debug("progress updated", readingProgress);

		if (shouldUpdate) {
			this.lastChapter = chapter.id;
			// TODO [Option] updateOnlyInList, confirmChapter
			const report = await Tachikoma.setProgress(chapter.progress);
			debug("Tachikoma.setProgress report", report, "for", chapter.progress);
		}
	}

	observe(target: Node, options?: MutationObserverInit | undefined) {
		this.observer = new MutationObserver((mutations, observer) => {
			this.checkAndUpdate();
		});
		this.observerOptions = { target, options };
		return this;
	}

	async start() {
		if (!this.chapterState) {
			this.initialized = true;
			const report = await Tachikoma.export();
			debug("sync report", { report });
			return;
		}
		if (!this.initialized) {
			this.initialized = true;
			this.checkAndUpdate();
		}
		if (this.observer && this.observerOptions) {
			this.observer.observe(this.observerOptions.target, this.observerOptions.options);
		}
	}
}
