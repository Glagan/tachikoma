/**
 * Title
 */

type TitleIdentifier = Record<any, any>;

type TitleInterface = {
	id?: number;
	name?: string;
	alt?: string[];

	chapter: number;
	volume?: number;

	score?: number;

	startDate?: Date;
	endDate?: Date;

	services: { [key: string]: TitleIdentifier };
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
