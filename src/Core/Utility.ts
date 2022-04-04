/**
 * source: https://stackoverflow.com/a/9517879
 * Inject a page script
 * Content scripts don't have access to variables, this does
 * Communicate using events: https://stackoverflow.com/a/19312198
 * @param {function} fn The function to be injected and executed
 */
export function injectScript(fn: Function) {
	const script = document.createElement("script");
	script.textContent = `(${fn})();`;
	(document.head || document.documentElement).appendChild(script);
	script.remove();
}

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
