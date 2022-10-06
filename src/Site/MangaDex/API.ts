import { DateTime } from "luxon";
import { Volcano } from "@Core/Volcano";
import type { MangaDexManga } from "@Service/MangaDex";

type MangaDexMangaResponse =
	| {
			result: "ok";
			response: "entity";
			data: MangaDexManga;
	  }
	| { result: "error"; errors: { id: string; status: number; title: string; detail: string }[] };

export default class MangaDexAPI {
	static cache: { [key: string]: { manga: MangaDexManga; time: DateTime } } = {};

	static async get(id: string): Promise<MangaDexManga | null> {
		if (this.cache[id] && this.cache[id].time > DateTime.now()) {
			return this.cache[id].manga;
		}
		const url = `https://api.mangadex.org/manga/${id}?includes[]=cover_art`;
		const response = await Volcano.get<MangaDexMangaResponse>(url);
		if (response.body?.result == "ok") {
			this.cache[id] = {
				manga: response.body.data,
				time: DateTime.now().plus({ minutes: 15 }),
			};
			return response.body.data;
		}
		return null;
	}
}
