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
	body?: string | object | null;
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
