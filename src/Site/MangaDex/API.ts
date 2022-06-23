import { Volcano } from "@Core/Volcano";
import { DateTime } from "luxon";

export type Links = {
	// https://anilist.co/manga/`{id}`
	al?: string;
	// https://www.anime-planet.com/manga/`{slug}`
	ap?: string;
	// https://bookwalker.jp/`{slug}` -- stored as "series/"
	bw?: string;
	// https://www.mangaupdates.com/series.html?id=`{id}`
	mu?: string;
	// https://www.novelupdates.com/series/`{slug}`
	nu?: string;
	// https://kitsu.io/api/edge/manga/`{id}` or https://kitsu.io/api/edge/manga?filter[slug]={slug}
	// If integer, use id version of the URL, otherwise use slug one
	kt?: string;
	// Stored as full URL
	amz?: string;
	// Stored as full URL
	ebj?: string;
	// https://myanimelist.net/manga/{id}
	mal?: string;
	// Stored as full URL
	cdj?: string;
	// Stored as full URL, untranslated stuff URL (original language)
	raw?: string;
	// Stored as full URL, official english licenced URL
	engtl?: string;
};
type Demographic = "shounen" | "shoujo" | "josei" | "seinen";
type PublicationStatus = "ongoing" | "completed" | "hiatus" | "cancelled";
type ContentRating = "safe" | "suggestive" | "erotica" | "pornographic";
type MangaRelationship =
	| "manga"
	| "chapter"
	| "cover_art"
	| "author"
	| "artist"
	| "scanlation_group"
	| "tag"
	| "user"
	| "custom_list";
type Related =
	| "monochrome"
	| "colored"
	| "preserialization"
	| "serialization"
	| "prequel"
	| "sequel"
	| "main_story"
	| "side_story"
	| "adapted_from"
	| "spin_off"
	| "based_on"
	| "doujinshi"
	| "same_franchise"
	| "shared_universe"
	| "alternate_story"
	| "alternate_version";

export type MangaDexManga = {
	id: string;
	type: "manga";
	attributes: {
		title: { en: string; [key: string]: string };
		altTitles: { [key: string]: string }[];
		description: { [key: string]: string };
		isLocked: boolean;
		links: Links;
		originalLanguage: string;
		lastVolume: string;
		lastChapter: string;
		publicationDemographic: Demographic;
		status: PublicationStatus;
		year: number;
		contentRating: ContentRating;
		chapterNumbersResetOnNewVolume: boolean;
		availableTranslatedLanguages: string[];
		tags: {
			id: string;
			type: "tag";
			attributes: {
				name: { en: string; [key: string]: string };
				description: { [key: string]: string };
				group: string;
				version: number;
			};
			relationships: {
				id: string;
				type: string;
			}[];
		}[];
		state: string;
		version: number;
		createdAt: string;
		updatedAt: string;
	};
	relationships: ({
		id: string;
		type: MangaRelationship;
		// related: Related;
	} & {
		type: "cover_art";
		attributes: {
			description: string;
			volume: string;
			fileName: string;
			locale: string;
			createdAt: string;
			updatedAt: string;
			version: number;
		};
	})[];
};

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
