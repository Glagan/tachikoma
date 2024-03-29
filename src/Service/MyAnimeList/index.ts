import { DateTime } from "luxon";
import {
	APIService,
	ServiceLogin,
	ServiceStatus,
	TitleFetchFailure,
	ExternalStatus,
	SaveResult,
	DeleteResult,
	SaveStatus,
	DeleteStatus,
	SearchStatus,
} from "@Core/Service";
import { Volcano } from "@Core/Volcano";
import { pkce } from "@Core/Utility";
import Title, { Status, TitleInterface } from "@Core/Title";
import { Score } from "@Core/Score";

const CLIENT_ID = "aaead2491067691606c70a480a0ebb02" as const;
const OAUTH2_AUTHORIZE = "https://myanimelist.net/v1/oauth2/authorize" as const;
const OAUTH2_TOKEN = "https://myanimelist.net/v1/oauth2/token" as const;

type Token = {
	token: string;
	refresh: string;
	expires: number;
};

const enum ListStatus {
	READING = "reading",
	COMPLETED = "completed",
	PAUSED = "on_hold",
	PLAN_TO_READ = "plan_to_read",
	DROPPED = "dropped",
}

/**
 * Date reference:
 * DateTime: ISO 8601
 * Date: "2017-10-23" or "2017-10" or "2017"
 * Time: "01:35"
 */

type NSFW = "white" | "gray" | "black";
type MediaType = "unknown" | "manga" | "novel" | "one_shot" | "doujinshi" | "manhwa" | "manhua" | "oel";
type PublicationStatus = "finished" | "currently_publishing" | "not_yet_published";

type MangaDetails = {
	id: number;
	title: string;
	main_picture: {
		medium: string;
		large?: string;
	};
	alternative_titles: {
		synonims: string[];
		en: string;
		ja: string;
	};
	start_date: string; // Date
	synopsis: string;
	mean: number;
	rank: number;
	popularity: number;
	num_list_users: number;
	num_scoring_users: number;
	nsfw: NSFW;
	created_at: string; // DateTime
	updated_at: string; // DateTime
	media_type: MediaType;
	num_volumes: number; // 0 if unknown
	num_chapters: number; // 0 if unknown
	status: PublicationStatus;
	authors: { node: { id: number; first_name: string; last_name: string }; role: string }[];
	pictures: { large?: string; medium: string }[];
	background: string | null;
	related_anime: any[]; // Not needed here
	related_manga: {
		node: MangaDetails;
		relation_type:
			| "sequel"
			| "prequel"
			| "alternative_setting"
			| "alternative_version"
			| "side_story"
			| "parent_story"
			| "summary"
			| "full_story";
		relation_type_formatted: string;
	}[];
	recommandations: { node: MangaDetails; num_recommendations: number }[];
	serialization: { node: { id: number; name: string }; role: string }[];
	my_list_status: {
		status: ListStatus;
		score: number; // Range from 0-10 where 0 means none
		num_volumes_read: number; // 0 means none
		num_chapters_read: number; // 0 means none
		is_rereading: boolean;
		start_date: string | null; // Date
		finish_date: string | null; // Date
		priority: number;
		num_times_reread: number;
		reread_value: number;
		tags: string[];
		comments: string;
		updated_at: string; // DateTime
	} | null;
};

type SearchNode = {
	node: {
		id: number;
		title: string;
		main_picture?: {
			large?: string | null;
			medium: string;
		} | null;
	};
};

class MyAnimeList_ extends APIService {
	name = "MyAnimeList";
	key = "mal";
	url = "https://myanimelist.net/";
	apiUrl = "https://api.myanimelist.net/v2/";

	theme = {
		background: "rgb(47, 82, 162)",
		color: "#ffffff",
	};

	headers(token: string) {
		return { Authorization: `Bearer ${token}` };
	}

	async validToken(): Promise<Partial<Token> | false> {
		const token = await this.storage.get<Token>();
		if (!token) return false;
		if (token.expires && DateTime.fromMillis(token.expires) >= DateTime.now()) {
			return token;
		}
		if (!token.refresh) return false;
		const response = await Volcano.post<{
			token_type: string;
			expires_in: number;
			access_token: string;
			refresh_token: string;
		}>(OAUTH2_TOKEN, {
			query: {
				client_id: CLIENT_ID,
				grant_type: "refresh_token",
				refresh_token: token.refresh,
			},
		});
		if (!response.ok || !response.body) {
			return false;
		}
		const refreshedToken: Token = {
			token: response.body.access_token,
			refresh: response.body.refresh_token,
			expires: DateTime.now().plus({ milliseconds: response.body.expires_in }).toMillis(),
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
		if (!token.token) return { status: ServiceStatus.MISSING_TOKEN };

		// MyAnimeList doesn't have an oauth check route so
		// -- simply request a route that require authentication and expect a ok response
		const response = await Volcano.get<{ id: Number; name: string }>(this.route("users/@me"), {
			headers: this.headers(token.token),
		});
		if (response.status == 401) {
			return { status: ServiceStatus.INVALID_TOKEN };
		} else if (response.status >= 400 && response.status < 500) {
			return { status: ServiceStatus.TACHIKOMA_ERROR };
		}
		if (response.ok && response.body) {
			return { status: ServiceStatus.LOGGED_IN, user: response.body.name };
		}
		return { status: ServiceStatus.SERVICE_ERROR };
	}

	/**
	 * OAuth2 login start URL on which the use must allow Tachikoma to create a token.
	 * A code verifier token is generated and save and will later be used in login.
	 * @returns string
	 */
	async loginRedirect(): Promise<string> {
		const { challenge, verifier } = await pkce(128);
		await this.storage.set({ challenge, verifier });
		return `${OAUTH2_AUTHORIZE}?${Volcano.buildQuery({
			response_type: "code",
			client_id: CLIENT_ID,
			state: verifier,
			code_challenge: challenge,
			code_challenge_method: "plain",
		})}`;
	}

	async login(informations: ServiceLoginInformations): Promise<{ status: ServiceLogin; message?: string }> {
		const savedState = await this.storage.get<{ challenge: String; verifier: string }>();
		if (!savedState.challenge || !savedState.verifier) {
			return { status: ServiceLogin.EXPIRED_CHALLENGE };
		}
		if (!informations.code || !informations.state) {
			return { status: ServiceLogin.MISSING_FIELDS };
		}
		if (informations.state != savedState.verifier) {
			return { status: ServiceLogin.INVALID_CHALLENGE };
		}
		const response = await Volcano.post<{
			token_type: string;
			expires_in: number;
			access_token: string;
			refresh_token: string;
		}>(OAUTH2_TOKEN, {
			query: {
				client_id: CLIENT_ID,
				grant_type: "authorization_code",
				code: informations.code,
				code_verifier: savedState.challenge,
			},
		});
		if (!response.ok || !response.body) {
			return { status: ServiceLogin.INVALID_CREDENTIALS };
		}
		await this.storage.set<Token>({
			token: response.body.access_token,
			refresh: response.body.refresh_token,
			expires: DateTime.now().plus({ milliseconds: response.body.expires_in }).toMillis(),
		});
		return { status: ServiceLogin.SUCCESS };
	}

	async logout(): Promise<boolean> {
		// Forgetting the token make tachikoma disconnected
		await this.storage.clear();
		return true;
	}

	needUpdate(title: TitleInterface, other: TitleInterface): boolean {
		return this.fieldsNeedUpdate(title, other, ["chapter", "volume", "status", "startDate", "endDate", "score"]);
	}

	toStatus(status: ListStatus): Status {
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
		}
		// WONT_READ is not available on MyAnimeList
		// and REREADING is hidden behind a flag
		return Status.NONE;
	}

	fromStatus(status: Status): ListStatus | null {
		switch (status) {
			case Status.READING:
			case Status.REREADING:
				return ListStatus.READING;
			case Status.COMPLETED:
				return ListStatus.COMPLETED;
			case Status.PAUSED:
				return ListStatus.PAUSED;
			case Status.PLAN_TO_READ:
				return ListStatus.PLAN_TO_READ;
			case Status.DROPPED:
				return ListStatus.DROPPED;
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
		if (!token.token) return { status: ExternalStatus.ACCOUNT_ERROR };

		const response = await Volcano.get<MangaDetails>(this.route(`manga/${id.id}?fields=my_list_status`), {
			headers: this.headers(token.token),
		});
		if (response.status >= 401 && response.status <= 403) {
			return { status: ExternalStatus.ACCOUNT_ERROR };
		}
		if (!response.body || response.status >= 500) {
			return { status: ExternalStatus.SERVICE_ERROR };
		}

		if (response.body.my_list_status) {
			const media = response.body;
			const listStatus = media.my_list_status!;
			return new Title({
				name: media.title,
				chapter: listStatus.num_chapters_read,
				volume: listStatus.num_volumes_read,
				status: this.toStatus(listStatus.status),
				score: listStatus.score ? new Score(media.my_list_status!.score, [1, 10]) : undefined,
				startDate: listStatus.start_date ? DateTime.fromISO(listStatus.start_date) : undefined,
				endDate: listStatus.finish_date ? DateTime.fromISO(listStatus.finish_date) : undefined,
				lastAccess: DateTime.now(),
				relations: { [this.key]: id },
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
		if (!token.token) return { status: SaveStatus.ACCOUNT_ERROR };

		const created = title.status === Status.NONE; // ???
		const response = await Volcano.patch(this.route(`manga/${id.id}/my_list_status`), {
			headers: this.headers(token.token),
			query: {
				status: this.fromStatus(title.status),
				is_rereading: title.status == Status.REREADING,
				score: title.score?.get([1, 10]) ?? 0,
				num_chapters_read: title.chapter ?? 0,
				num_volumes_read: title.volume ?? 0,
				start_date: title.startDate?.toISODate(),
				finish_date: title.endDate?.toISODate(),
				// priority: 0,
				// num_times_reread: 0,
				// reread_value: 0,
				// tags: '',
				// comments: '',
			},
		});
		if (response.status >= 401 && response.status <= 403) {
			return { status: SaveStatus.ACCOUNT_ERROR };
		}

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
		if (!token.token) return { status: DeleteStatus.ACCOUNT_ERROR };

		await Volcano.deleteRequest(this.route(`manga/${id.id}/my_list_status`), {
			headers: this.headers(token.token),
		});

		return { status: DeleteStatus.SUCCESS };
	}

	link(id: TitleIdentifier): string | undefined {
		if (!id.id) return undefined;
		return this.route(`manga/${id.id}`, true);
	}

	async search(query: string, page?: number) {
		const token = await this.validToken();
		if (!token) {
			return {
				status: SearchStatus.ACCOUNT_ERROR,
				message: "Failed to refresh token",
			};
		}
		if (!token.token) return { status: SearchStatus.ACCOUNT_ERROR };

		// Simple search request, /manga?q=search
		if (!page) page = 1;
		const response = await Volcano.get<{
			data: SearchNode[];
			paging: {
				previous: string;
				next: string;
			};
		}>(
			this.route(
				`manga?${Volcano.buildQuery({
					q: query,
					offset: (page - 1) * 100,
				})}`
			),
			{ headers: this.headers(token.token) }
		);

		if (response.status >= 401 && response.status <= 403) {
			return { status: SearchStatus.ACCOUNT_ERROR };
		}
		if (!response.body || response.status >= 500) {
			return { status: SearchStatus.SERVICE_ERROR };
		}

		return response.body.data.map(({ node }) => ({
			name: node.title,
			thumbnail: node.main_picture?.medium,
			identifier: { id: node.id },
		}));
	}
}
export default new MyAnimeList_();
