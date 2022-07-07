// Colors of highlighted chapter in lists
interface Colors {
	enabled: boolean;
	highlights: string[];
	nextChapter: string;
	higherChapter: string;
	lowerChapter: string;
	openedChapter: string;
}

// Notifications visbility and duration
interface Notifications {
	enabled: boolean;
	displayProgressUpdated: boolean;
	errorNotifications: boolean;
	errorDuration: number;
	infoDuration: number;
	successDuration: number;
}

// Chapter and Title List / Updates
interface ListVisibility {
	hideHigher: boolean;
	hideLower: boolean;
	hideLast: boolean;
}

// Reading options
interface Reading {
	saveOpenedChapters: boolean;
	chaptersSaved: number;
	saveOnlyHigher: boolean;
	saveOnlyNext: boolean;
	confirmChapter: boolean;
	updateOnlyInList: boolean;
	saveOnLastPage: boolean;
}

type GlobalOptionlist = {
	// Options that can override by Site options
	highlight: boolean;
	colors: Colors;
	notifications: Notifications;
	lists: ListVisibility;
	reading: Reading;
	// History
	// biggerHistory: boolean;
	// refreshHistory: boolean;
	// Services
	services: string[];
	// Sync
	// checkOnStartup: boolean;
	// checkOnStartupMainOnly: boolean;
	// checkOnStartupCooldown: number;
	// Global
	// useMochi: boolean;
	version: number;
	subVersion: number;
};
type OptionList = GlobalOptionlist;

// * // @see https://stackoverflow.com/a/58436959/7794671
// * // @see https://stackoverflow.com/questions/61644053

type Join<K, P> = K extends string | number
	? P extends string | number
		? `${K}${"" extends P ? "" : "."}${P}`
		: never
	: never;

type Paths<T, D extends number = 10> = [D] extends [never]
	? never
	: T extends Array<any>
	? ""
	: T extends object
	? {
			[K in keyof T]-?: K extends string | number ? `${K}` | Join<K, Paths<T[K], Prev[D]>> : never;
	  }[keyof T]
	: "";

type Leaves<T, D extends number = 10> = [D] extends [never]
	? never
	: T extends Array<any>
	? ""
	: T extends object
	? { [K in keyof T]-?: Join<K, Leaves<T[K], Prev[D]>> }[keyof T]
	: "";

// * //

type MutableOption = Leaves<Omit<OptionList, "services" | "version" | "subVersion">>;

type SiteEnabledOptions = {
	[key: string]: {
		key: string;
		enabledOptions: MutableOption[];
	};
};
