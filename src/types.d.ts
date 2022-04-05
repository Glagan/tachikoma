/**
 * Title
 */

type TitleIdentifier = Record<any, any>;

declare const enum Status {
	NONE,
	READING,
	COMPLETED,
	PAUSED,
	PLAN_TO_READ,
	DROPPED,
	REREADING,
	WONT_READ,
}

type DateTime = import("luxon").DateTime;

type TitleInterface = {
	// Local **tachikoma** id
	id?: number;
	// Favorite name for the title
	name?: string;

	// Last read chapter
	chapter: number;
	// Volume of the current chapter
	volume?: number;
	// Stauts of the title
	status: Status;

	/**
	 * Score from 0-100
	 * TODO Convert to a class to handle different ranges
	 */
	score?: number;

	// Start time (automatically updated)
	startDate?: DateTime;
	// End time (automatically updated)
	endDate?: DateTime;

	// List of {Service.key}
	services: { [key: string]: TitleIdentifier };
	// Creation time
	creation?: DateTime;
	// Last update time
	lastUpdate?: DateTime;
	// Last access time (update in all pages)
	lastAccess?: DateTime;
};

type TitleStorageInterface = {
	i: number; // ID
	n?: string; // Name
	c: number; // Chapter
	v?: number; // Volume
	s: Status; // Status
	r?: number; // Score
	t?: number; // Start Date
	e?: number; // End Date
	$?: { [key: string]: TitleIdentifier }; // Services
	o?: number; // Creation Date
	u?: number; // Last Update
	a?: number; // Last Access
};

type ServiceLoginInformations = Record<any, any>;

interface Progress {
	chapter: number;
	volume?: number;
	oneshot?: boolean;
}

/**
 * Magma
 */

interface APIRateLimit {
	limit: number;
	remaining: number;
	retry?: number;
}

interface FormDataFile {
	content: string[];
	name: string;
	options?: FilePropertyBag | undefined;
}

interface FormDataProxy {
	[key: string]: string | number | FormDataFile;
}

interface HttpRequest {
	method?: "GET" | "POST" | "HEAD" | "OPTIONS" | "DELETE" | "PUT" | "PATCH";
	url: string;
	body?: string | null;
	query?: Record<any, any>;
	form?: FormDataProxy | FormData;
	mode?: RequestMode;
	headers?: HeadersInit;
	redirect?: RequestRedirect;
	credentials?: RequestCredentials;
}

type HttpResponse<T = any, E = any> = {
	url: string;
	redirected: boolean;
	status: number;
	headers: Record<string, string>;
} & ({ ok: true; body?: T } | { ok: false; body?: E });

type RawHttpResponse = HttpResponse<string, string>;

type JSONHttpResponse<T extends {} = Record<string, any>, E extends {} = Record<string, any>> = HttpResponse<T, E>;

/**
 * Messages
 * Pair of [send message payload, received response] for each type of messages.
 */

type MessageDescriptions = {
	request: [HttpRequest, RawHttpResponse];
};

type MessageParams<K extends keyof MessageDescriptions> = MessageDescriptions[K] extends never
	? [action: K]
	: MessageDescriptions[K] extends Array<any>
	? MessageDescriptions[K][0] extends never
		? [action: K]
		: [action: K, payload: MessageDescriptions[K][0]]
	: [action: K, payload: MessageDescriptions[K]];

type MessagePayload<K extends keyof MessageDescriptions> = MessageDescriptions[K] extends never
	? { action: K }
	: MessageDescriptions[K] extends Array<any>
	? MessageDescriptions[K][0] extends never
		? { action: K }
		: { action: K } & MessageDescriptions[K][0]
	: { action: K } & MessageDescriptions[K];

type MessageResponse<K extends keyof MessageDescriptions> = MessageDescriptions[K] extends never
	? void
	: MessageDescriptions[K] extends Array<any>
	? MessageDescriptions[K][1]
	: MessageDescriptions[K];

type AnyMessagePayload<K = keyof MessageDescriptions> = K extends infer U ? MessagePayload<U> : never;

/**
 * Storage
 */

declare const OPTIONS_KEY = "~options";
declare const NEXT_KEY = "@next";

type BasicToken = {
	token: string;
	refresh: string;
};

type StorageTitle = {
	[key: `_${number}`]: TitleStorageInterface | undefined;
	[key: `=${string}>${string}`]: number | undefined;
};

type StorageService = {
	[key: `$${string}`]: Record<string, any> | undefined;
};

type StorageMap = {
	[OPTIONS_KEY]: OptionList;
	[NEXT_KEY]: number;
} & StorageTitle &
	StorageService;
