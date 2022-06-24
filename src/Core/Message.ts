import { runtime } from "webextension-polyfill";
import { debug } from "./Logger";

export namespace Message {
	function sender<K extends keyof MessageDescriptions>() {
		if (process.env.VENDOR === "userscript") {
			return async (...params: MessageParams<K>): Promise<any> => {
				// TODO emit event and return response
				throw new Error("Not implemented");
			};
		} else {
			return runtime.sendMessage;
		}
	}

	/**
	 * Send a message to the background running script.
	 */
	export function send<K extends keyof MessageDescriptions>(
		...params: MessageParams<K>
	): Promise<MessageResponse<K>> {
		debug("sending runtime message", ...params);
		if (params.length == 2) {
			// payload: params[1] is always an object if present
			return sender<K>()({ ...(params[1] as any), action: params[0] });
		}
		return sender<K>()({ action: params[0] } as MessagePayload<K>);
	}
}
