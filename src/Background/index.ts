import { Runtime, runtime } from "webextension-polyfill";
import { Magma } from "@Core/Magma";

function onMessage(message: AnyMessagePayload, sender?: Runtime.MessageSender): Promise<any> {
	if (message.action == "request") {
		return Magma.send(message, sender?.tab);
	}
	return Promise.resolve(true);
}

runtime.onMessage.addListener(onMessage);
