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
