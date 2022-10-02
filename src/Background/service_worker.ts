import type { Runtime } from "webextension-polyfill";
import { Magma } from "@Core/Magma";

function onMessage(
	message: AnyMessagePayload,
	sender: Runtime.MessageSender | undefined,
	sendResponse: (...args: any[]) => void
) {
	if (message.action == "request") {
		// This is stupid...
		Magma.send(message, sender?.tab)
			.then((response) => {
				sendResponse(response);
			})
			.catch((error) => {
				sendResponse(error);
			});
		return true;
	}
	return false;
}

/// @ts-expect-error chrome is defined on chrome
chrome.runtime.onMessage.addListener(onMessage);
