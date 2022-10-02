import { runtime, type Runtime } from "webextension-polyfill";
import { Magma } from "@Core/Magma";

export default function onMessage(message: AnyMessagePayload, sender?: Runtime.MessageSender): Promise<unknown> {
	if (message.action == "request") {
		return Magma.send(message, sender?.tab);
	}
	return Promise.resolve(true);
}

runtime.onMessage.addListener(onMessage);
