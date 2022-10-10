import { runtime } from "webextension-polyfill";
import getPkce from "oauth-pkce";
import { debug } from "./Logger";

export function deepAssign(target: Record<string, any>, ...objs: Record<string, any>[]) {
	for (let i = 0, max = objs.length; i < max; i++) {
		for (var k in objs[i]) {
			if (objs[i][k] != null && typeof objs[i][k] === "object" && !Array.isArray(objs[i][k]))
				target[k] = deepAssign(target[k] ? target[k] : {}, objs[i][k]);
			else target[k] = objs[i][k];
		}
	}
	return target;
}

export function nestedKeyReference<E extends any, R extends Record<string, E> = Record<string, E>>(
	object: Object,
	key: MutableOption
): { ref: R; key: keyof R } {
	const parts = key.split(".");
	const last = parts.length;
	let currentReference: Record<string, any> = object;
	for (let index = 0; index < parts.length; index++) {
		const part = parts[index];
		if (index + 1 == last) break;
		if (part in currentReference && typeof currentReference[part] === "object") {
			currentReference = currentReference[part];
		} else {
			currentReference[part] = {};
			currentReference = currentReference[part];
		}
	}
	return { ref: currentReference as R, key: parts[last - 1] };
}

export function pkce(length: number): Promise<{ verifier: string; challenge: string }> {
	return new Promise((resolve) => {
		getPkce(length, (_error, codes) => {
			resolve(codes);
		});
	});
}

/**
 * Returns the full URL of file from the extension.
 * @param file Absolute path to the file
 */
export function file(file: string): string {
	return runtime.getURL(file);
}

export function waitForSelector(selector: string, timeout: number = 5000): Promise<boolean> {
	if (!document.querySelector(selector)) {
		debug("Waiting for", selector, "to load");
		return new Promise((resolve, reject) => {
			let timer = setTimeout(() => {
				reject();
			}, timeout);
			const initObserver = new MutationObserver((_, observer) => {
				if (document.querySelector(selector)) {
					clearTimeout(timer);
					resolve(true);
					initObserver.disconnect();
				}
			});
			initObserver.observe(document.body, { childList: true, subtree: true });
		});
	}
	return Promise.resolve(true);
}
