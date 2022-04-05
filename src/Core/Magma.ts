import { cookies, Tabs } from "webextension-polyfill";
import { Volcano } from "./Volcano";

export namespace Magma {
	const DEFAULT_COOLDOWN = 1250;
	const apiRateLimit: { [key: string]: APIRateLimit } = {};
	const lastRequest: Record<string, number> = {};

	function findDomain(url: string): string {
		// Simple domain search - not the best but simple
		const res = /https?:\/\/(?:.+\.)?([-\w\d]+\.(?:\w{2,5}))(?:$|\/)/i.exec(url);
		if (res !== null) {
			return res[1];
		}
		return "*";
	}

	export function send(request: HttpRequest, tab?: Tabs.Tab): Promise<HttpResponse> {
		return new Promise(async (resolve) => {
			// Cooldown
			const domain = findDomain(request.url);
			const now = Date.now();

			// Sleep until cooldown is reached
			const cooldown = DEFAULT_COOLDOWN;
			if (lastRequest[domain] && lastRequest[domain] + cooldown >= now) {
				const diff = lastRequest[domain] + cooldown - now;
				await new Promise((resolve) => setTimeout(resolve, diff));
			}
			lastRequest[domain] = now + 50;

			// Check Rate Limit
			if (apiRateLimit[domain]) {
				const rateLimit = apiRateLimit[domain];

				// Sleep until Retry-After seconds
				if (rateLimit.retry) {
					await new Promise((resolve) => setTimeout(resolve, rateLimit.retry));
					delete rateLimit.retry;
				}
				// Add sleep time if the remaining rate limit is getting low
				else {
					const percentRemaining = rateLimit.remaining / rateLimit.limit;
					// If we used more than 50% of our rate limit
					// We will sleep at least 50% of the cooldown duration
					if (percentRemaining < 0.5) {
						// Sleep "cooldown * (1 - (percentRemaining * 1.5))" ms
						await new Promise((resolve) => setTimeout(resolve, cooldown * (1 - percentRemaining * 1.5)));
					}
				}
			}

			// infer body from params
			const headers = new Headers(request.headers);
			let body: BodyInit | undefined;
			// Convert FormData from an object since it can't be received as a Class
			if (request.form !== undefined) {
				if (!(request.form instanceof FormData)) {
					if (!headers.has("Content-Type")) {
						headers.set("Content-Type", "application/x-www-form-urlencoded");
					}
					const formBody = new FormData();
					for (const key in request.form as FormDataProxy) {
						if (request.form.hasOwnProperty(key)) {
							const element = request.form[key];
							if (typeof element === "string") {
								formBody.set(key, element);
							} else if (typeof element === "number") {
								formBody.set(key, element.toString());
							} else {
								formBody.set(key, new File(element.content, element.name, element.options));
							}
						}
					}
					body = formBody;
				}
			} else if (request.query) {
				if (!headers.has("Content-Type")) {
					headers.set("Content-Type", "application/x-www-form-urlencoded");
				}
				body = Volcano.buildQuery(request.query);
			} else if (request.body) {
				if (!headers.has("Content-Type") && typeof request.body === "object" && request.body !== null) {
					headers.set("Content-Type", "application/json");
					body = JSON.stringify(request.body);
				} else if (typeof request.body === "object") {
					body = JSON.stringify(request.body);
				} else {
					body = request.body;
				}
			}

			// Options
			const init: RequestInit & { headers: Headers } = {
				method: request.method ?? "GET",
				body: body ?? null,
				redirect: request.redirect ?? "follow",
				mode: request.mode ?? undefined,
				credentials: request.credentials ?? "same-origin",
				headers: headers,
			};

			// Get container cookies
			// Doesn't work on Chrome, cookieStoreId is static
			// Only find for sites which require cookies
			if (process.env.VENDOR === "firefox") {
				if (
					tab &&
					(init.credentials == "same-origin" ||
						(init.credentials == "include" && tab.cookieStoreId !== undefined)) &&
					init.credentials === "include"
				) {
					const storeId = tab!.cookieStoreId;
					const cookiesList = await cookies.getAll({ url: request.url, storeId });
					const cookiesStr = cookiesList.map((c) => `${c.name}=${c.value}`).join("; ");
					if (cookiesStr != "") init.headers.set("X-Cookie", cookiesStr);
				}
			}

			// Add X-Origin and X-Referer if needed
			// if (init.headers['Origin']) init.headers['X-Origin'] = init.headers['Origin'];
			// if (init.headers['Referer']) init.headers['X-Referer'] = init.headers['Referer'];

			resolve(
				await fetch(request.url, init)
					.then(async (response) => {
						// Save X-RateLimit-* headers for next request
						if (response.headers.has("X-RateLimit-Limit")) {
							if (!apiRateLimit[domain]) {
								apiRateLimit[domain] = {
									limit: parseInt(response.headers.get("X-RateLimit-Limit")!),
								} as APIRateLimit;
							}
							if (response.headers.has("X-RateLimit-Remaining")) {
								apiRateLimit[domain].remaining = parseInt(
									response.headers.get("X-RateLimit-Remaining")!
								);
								if (response.headers.has("Retry-After")) {
									apiRateLimit[domain].retry = parseInt(response.headers.get("Retry-After")!);
								}
							} else delete apiRateLimit[domain];
						}
						// Chrome doesn't allow message with the Headers class
						// -- An iterative copy is required
						const headers: Record<string, string> = {};
						for (const pair of response.headers.entries()) {
							headers[pair[0]] = pair[1];
						}
						return <RawHttpResponse>{
							url: response.url,
							ok: response.status >= 200 && response.status < 400,
							status: response.status,
							failed: false,
							code: response.status,
							redirected: response.redirected,
							headers,
							body: await response.text(),
						};
					})
					.catch(async (error) => {
						return <HttpResponse>{
							url: request.url,
							ok: false,
							status: 0,
							redirected: false,
							headers: {},
							body: error.toString(),
						};
					})
			);
		});
	}
}
