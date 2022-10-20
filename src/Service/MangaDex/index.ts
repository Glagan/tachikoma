import { DateTime } from "luxon";
import {
	APIService,
	LoginField,
	ServiceLogin,
	ServiceStatus,
	TitleFetchFailure,
	ExternalStatus,
	SaveResult,
	SaveStatus,
	DeleteResult,
	DeleteStatus,
	SearchStatus,
} from "@Core/Service";
import { Volcano } from "@Core/Volcano";
import Title, { Status, TitleInterface } from "@Core/Title";
import { info } from "@Core/Logger";
import MyAnimeList from "@Service/MyAnimeList";
import MangaPlusKey from "@Site/MangaPlus/key";
import Anilist from "@Service/Anilist";
import Kitsu from "@Service/Kitsu";

type Token = {
	session: string;
	refresh: string;
	expires: number;
};

const enum ListStatus {
	READING = "reading",
	PAUSED = "on_hold",
	PLAN_TO_READ = "plan_to_read",
	DROPPED = "dropped",
	REREADING = "re_reading",
	COMPLETED = "completed",
}

type ResponseError = {
	result: "error";
	errors: {
		id: string;
		status: number;
		title: string;
		detail: string;
	}[];
};

type UserResponse =
	| {
			result: "ok";
			response: "entity";
			data: {
				id: string;
				type: "user";
				attributes: {
					username: string;
					roles: string[];
					version: number;
				};
				relationships: {
					id: string;
					type: string;
					related: string;
					attributes: {};
				}[];
			};
	  }
	| ({ result: "error" } & ResponseError);

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
		links?: Links;
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

type SearchResponse =
	| {
			result: "ok";
			response: "collection";
			data: MangaDexManga[];
	  }
	| ({ result: "error" } & ResponseError);

/***
 * Only the `status` is currently available on MangaDex.
 */
class MangaDex_ extends APIService {
	name = "MangaDex";
	key = "md";
	url = "https://mangadex.org/";
	apiUrl = "https://api.mangadex.org/";

	theme = {
		background: "rgb(44, 44, 44)",
		color: "rgb(255, 103, 64)",
	};

	loginInformations: LoginField[] = [
		{
			type: "text",
			name: "username",
			label: "Username",
		},
		{
			type: "password",
			name: "password",
			label: "Password",
		},
	];

	headers(token: string) {
		return { Authorization: `Bearer ${token}` };
	}

	async validToken(): Promise<Partial<Token> | false> {
		const token = await this.storage.get<Token>();
		if (!token || !token.refresh) return false;
		if (token.expires && DateTime.fromMillis(token.expires) >= DateTime.now()) {
			return token;
		}
		info("Refreshing MangaDex token at", DateTime.now().toString());
		const response = await Volcano.post<{
			result: string;
			token: {
				session: string;
				refresh: string;
			};
		}>(this.route("auth/refresh"), {
			body: { token: token.refresh },
		});
		if (response.status >= 400 || !response.body) {
			return false;
		}
		const refreshedToken: Token = {
			session: response.body.token.session,
			refresh: response.body.token.refresh,
			expires: DateTime.now().plus({ minutes: 14 }).toMillis(),
		};
		await this.storage.set<Token>(refreshedToken);
		return refreshedToken;
	}

	async status() {
		const token = await this.validToken();
		if (!token) {
			return {
				status: ServiceStatus.INVALID_TOKEN,
				message: "Failed to refresh token",
			};
		}
		if (!token.session) return { status: ServiceStatus.MISSING_TOKEN };

		const response = await Volcano.get<UserResponse>(this.route("user/me"), {
			headers: this.headers(token.session),
		});
		if (response.ok && response.body?.result == "ok") {
			return { status: ServiceStatus.LOGGED_IN, user: response.body.data.attributes.username };
		}
		if (response.status == 401 || response.body?.result === "error") {
			return { status: ServiceStatus.INVALID_TOKEN };
		} else if (response.status >= 400 && response.status < 500) {
			return { status: ServiceStatus.TACHIKOMA_ERROR };
		}
		return { status: ServiceStatus.SERVICE_ERROR };
	}

	async login(informations: ServiceLoginInformations): Promise<{ status: ServiceLogin }> {
		if (!informations.username || !informations.password) {
			return { status: ServiceLogin.MISSING_FIELDS };
		}
		const response = await Volcano.post<{
			result: string;
			token: {
				session: string;
				refresh: string;
			};
		}>(this.route("auth/login"), {
			body: {
				username: informations.username,
				password: informations.password,
			},
		});
		if (response.status >= 400 && response.status <= 401) {
			return { status: ServiceLogin.INVALID_CREDENTIALS };
		}
		if (!response.body) {
			return { status: ServiceLogin.SERVICE_ERROR };
		}
		await this.storage.set<Token>({
			session: response.body.token.session,
			refresh: response.body.token.refresh,
			expires: DateTime.now().plus({ minutes: 14 }).toMillis(),
		});
		return { status: ServiceLogin.SUCCESS };
	}

	async logout(): Promise<boolean> {
		const token = await this.storage.get<Token>();
		// If the request failed (invalid token or expired) then the sessions is already "disconnected"
		// So we can safely ignore the error and just remove the stored tokens
		if (token && token.session) {
			await Volcano.post(this.route("auth/logout"), {
				headers: this.headers(token.session),
			});
		}
		await this.storage.clear();
		return true;
	}

	// Only the status is currently saved in MangaDex
	needUpdate(title: TitleInterface, other: TitleInterface): boolean {
		return this.fieldsNeedUpdate(title, other, ["status"]);
	}

	toStatus(status: ListStatus | null): Status {
		switch (status) {
			case ListStatus.READING:
				return Status.READING;
			case ListStatus.COMPLETED:
				return Status.COMPLETED;
			case ListStatus.PAUSED:
				return Status.PAUSED;
			case ListStatus.PLAN_TO_READ:
				return Status.PLAN_TO_READ;
			case ListStatus.DROPPED:
				return Status.DROPPED;
			case ListStatus.REREADING:
				return Status.REREADING;
		}
		// Only WONT_READ is not available on MangaDex
		return Status.NONE;
	}

	fromStatus(status: Status): ListStatus | null {
		switch (status) {
			case Status.READING:
				return ListStatus.READING;
			case Status.COMPLETED:
				return ListStatus.COMPLETED;
			case Status.PAUSED:
				return ListStatus.PAUSED;
			case Status.PLAN_TO_READ:
				return ListStatus.PLAN_TO_READ;
			case Status.DROPPED:
				return ListStatus.DROPPED;
			case Status.REREADING:
				return ListStatus.REREADING;
		}
		// WONT_READ and NONE returns null
		// -- Remove it from the user list
		return null;
	}

	async get(id: TitleIdentifier): Promise<Title | TitleFetchFailure> {
		if (!id.id) return { status: ExternalStatus.ID_ERROR };
		const token = await this.validToken();
		if (!token) {
			return {
				status: ExternalStatus.ACCOUNT_ERROR,
				service: ServiceStatus.INVALID_TOKEN,
				message: "Failed to refresh token",
			};
		}
		if (!token || !token.session) return { status: ExternalStatus.ACCOUNT_ERROR };

		const response = await Volcano.get<
			{
				result: "ok";
				status: ListStatus | null;
			},
			ResponseError
		>(this.route(`manga/${id.id}/status`), { headers: this.headers(token.session) });

		if (response.status >= 401 && response.status <= 403) {
			return { status: ExternalStatus.ACCOUNT_ERROR };
		}
		if (!response.body || response.body.result == "error") {
			return { status: ExternalStatus.SERVICE_ERROR };
		}

		const status = this.toStatus(response.body.status);
		if (status != Status.NONE) {
			return new Title({
				chapter: 0,
				relations: { [this.key]: id },
				status: this.toStatus(response.body.status),
			});
		}
		return { status: ExternalStatus.NOT_IN_LIST };
	}

	async save(id: TitleIdentifier, title: Title): Promise<SaveResult> {
		if (!id.id) return { status: SaveStatus.ID_ERROR };
		const token = await this.validToken();
		if (!token) {
			return {
				status: SaveStatus.ACCOUNT_ERROR,
				message: "Failed to refresh token",
			};
		}
		if (!token || !token.session) return { status: SaveStatus.ACCOUNT_ERROR };

		const created = title.status === Status.NONE;
		const response = await Volcano.post<{ result: "ok" }, ResponseError>(this.route(`manga/${id.id}/status`), {
			headers: this.headers(token.session),
			body: { status: this.fromStatus(title.status) },
		});

		return { status: created ? SaveStatus.CREATED : SaveStatus.SUCCESS };
	}

	async delete(id: TitleIdentifier): Promise<DeleteResult> {
		if (!id.id) return { status: DeleteStatus.ID_ERROR };
		const token = await this.validToken();
		if (!token) {
			return {
				status: DeleteStatus.ACCOUNT_ERROR,
				message: "Failed to refresh token",
			};
		}
		if (!token || !token.session) return { status: DeleteStatus.ACCOUNT_ERROR };

		// Only the status is currently available on MangaDex
		// So "deleting" the title only means setting it's status to null
		await Volcano.post<{ result: "ok" }, ResponseError>(this.route(`manga/${id.id}/status`), {
			headers: this.headers(token.session),
			body: { status: null },
		});

		return { status: DeleteStatus.SUCCESS };
	}

	link(id: TitleIdentifier): string | undefined {
		if (!id.id) return undefined;
		return this.route(`title/${id.id}`, true);
	}

	/**
	 * Convert a list of services from their full names and the resource URL to a corresponding
	 * tachikoma service and it's TitleIdentifier for the service.
	 * @param services List of Service fullnames and their URL as stored in MangaDex
	 * @returns List of services formatted for tachikoma
	 */
	extractRelations(services?: Links): { [key: string]: TitleIdentifier } {
		let converted: { [key: string]: TitleIdentifier } = {};
		if (!services) {
			return converted;
		}
		if (services.mal) {
			converted[MyAnimeList.key] = { id: parseInt(services.mal) };
		}
		if (services.al) {
			converted[Anilist.key] = { id: parseInt(services.al) };
		}
		if (services.kt) {
			// Ignore slug keys
			const key = parseInt(services.kt);
			if (!isNaN(key)) {
				converted[Kitsu.key] = { id: parseInt(services.kt) };
			}
		}
		if (services.engtl && services.engtl?.indexOf("mangaplus.shueisha.co.jp")) {
			// https://mangaplus.shueisha.co.jp/titles/100071
			const match = services.engtl.match(/\/titles\/(\d+)\/?$/);
			const id = parseInt(match?.[1] ?? "");
			if (id && !isNaN(id)) {
				converted[MangaPlusKey] = { id };
			}
		}
		return converted;
	}

	extractCover(mangaDexManga: MangaDexManga, size?: "small" | "regular"): string | undefined {
		let cover = mangaDexManga.relationships.find((relation) => relation.type == "cover_art");
		if (cover) {
			let sizePx = !size || size == "small" ? 256 : 512;
			return `https://uploads.mangadex.org/covers/${mangaDexManga.id}/${cover.attributes.fileName}.${sizePx}.jpg`;
		}
		return undefined;
	}

	async search(query: string, page?: number) {
		const token = await this.validToken();
		// Use the token if it's available, it's not required

		// Simple search request, /manga?title=search
		// cover_art is required to get the thumbnail
		if (!page) page = 1;
		const response = await Volcano.get<SearchResponse>(
			this.route(
				`manga?${Volcano.buildQuery({
					title: query,
					"includes[]": "cover_art",
					offset: (page - 1) * 100,
				})}`
			),
			{ headers: token && token?.session ? this.headers(token.session) : undefined }
		);

		if (response.status >= 401 && response.status <= 403) {
			return { status: SearchStatus.ACCOUNT_ERROR };
		}
		if (!response.body || response.status >= 500 || response.body.result !== "ok") {
			return { status: SearchStatus.SERVICE_ERROR };
		}

		return response.body.data.map((manga) => ({
			name: manga.attributes.title.en,
			thumbnail: this.extractCover(manga),
			identifier: { id: manga.id },
			external: this.extractRelations(manga.attributes.links),
		}));
	}
}
export default new MangaDex_();
