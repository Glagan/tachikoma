import { Message } from "./Message";

/**
 * HTTP Wrapper to *send* requests and receive a response.
 * This wrapper sends a Message which will be read by Magma that will send the actual request.
 * The purpose of this wrapper is a modular entry which can be replaced.
 */
export namespace Volcano {
	export function buildQuery(params: { [key: string]: any }, doBody: boolean = true): string {
		return Object.keys(params)
			.filter((f) => params[f] !== undefined)
			.map((f) => `${encodeURIComponent(f)}=${doBody ? encodeURIComponent(params[f]) : params[f]}`)
			.join("&");
	}

	/**
	 * Send a GET request.
	 * @param url The URL to send the GET request to
	 * @param init RequestInit params
	 */
	export async function get<R = any, E = R>(
		url: string,
		init?: Omit<HttpRequest, "url" | "method">
	): Promise<HttpResponse<R, E>> {
		const response = await Message.send("request", { ...init, method: "GET", url });
		return processResponse(response);
	}

	/**
	 * Send a POST request.
	 * @param url The URL to send the POST request to
	 * @param init RequestInit params
	 */
	export async function post<R = any, E = R>(
		url: string,
		init?: Omit<HttpRequest, "url" | "method">
	): Promise<HttpResponse<R, E>> {
		const response = await Message.send("request", { ...init, method: "POST", url });
		return processResponse(response);
	}

	/**
	 * Send a PUT request.
	 * @param url The URL to send the POST request to
	 * @param init RequestInit params
	 */
	export async function put<R = any, E = R>(
		url: string,
		init?: Omit<HttpRequest, "url" | "method">
	): Promise<HttpResponse<R, E>> {
		const response = await Message.send("request", { ...init, method: "PUT", url });
		return processResponse(response);
	}

	/**
	 * Send a PATCH request.
	 * @param url The URL to send the POST request to
	 * @param init RequestInit params
	 */
	export async function patch<R = any, E = R>(
		url: string,
		init?: Omit<HttpRequest, "url" | "method">
	): Promise<HttpResponse<R, E>> {
		const response = await Message.send("request", { ...init, method: "PATCH", url });
		return processResponse(response);
	}

	/**
	 * Send a DELETE request.
	 * @param url The URL to send the POST request to
	 * @param init RequestInit params
	 */
	export async function deleteRequest<R = any, E = R>(
		url: string,
		init?: Omit<HttpRequest, "url" | "method">
	): Promise<HttpResponse<R, E>> {
		const response = await Message.send("request", { ...init, method: "DELETE", url });
		return processResponse(response);
	}

	/**
	 * Check if the response should be handled as JSON and parse it.
	 */
	async function processResponse<R = any, E = R>(response: RawHttpResponse): Promise<HttpResponse<R, E>> {
		if (response.body) {
			for (const key in response.headers) {
				if (
					key.toLocaleLowerCase() === "content-type" &&
					response.headers[key].match(/application\/(?:vnd.api\+)?json(?:;\s*(?:charset=.+;?)?)?/)
				) {
					response.body = JSON.parse(response.body!);
					return response as JSONHttpResponse<R, E>;
				}
			}
		}
		return response as HttpResponse<R, E>;
	}
}
