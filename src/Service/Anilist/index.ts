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
import Title, { Status, TitleInterface } from "@Core/Title";
import { Score } from "@Core/Score";

const CLIENT_ID = 9830 as const;

type Token = {
	token: string;
	expires: number;
};

export const enum ListStatus {
	NONE = "NONE",
	READING = "CURRENT",
	COMPLETED = "COMPLETED",
	PAUSED = "PAUSED",
	DROPPED = "DROPPED",
	PLAN_TO_READ = "PLANNING",
	REREADING = "REPEATING",
}

export interface AnilistDate {
	day: number | null;
	month: number | null;
	year: number | null;
}

interface AnilistViewerResponse {
	data: {
		Viewer: {
			id: number;
			name: string;
		};
	};
}

export interface SaveMediaListEntry {
	id: number;
	mediaId: number;
	status: ListStatus;
	scoreRaw?: number;
	progress?: number;
	progressVolumes?: number;
	startedAt?: AnilistDate;
	completedAt?: AnilistDate;
}

export interface AnilistMedia {
	title: {
		userPreferred: string;
	};
	chapters: number | null;
	volumes: number | null;
	mediaListEntry: {
		id: number;
		status: ListStatus;
		score: number | null;
		progress: number;
		progressVolumes: number;
		startedAt: AnilistDate;
		completedAt: AnilistDate;
	} | null;
}

export interface AnilistGetResponse {
	data: {
		Media: AnilistMedia;
	};
}

const GET_QUERY = `
	query ($mediaId:Int) {
		Media(id:$mediaId) {
			title {
				userPreferred
			}
			chapters
			volumes
			mediaListEntry {
				id
				status
				score(format: POINT_100)
				progress
				progressVolumes
				startedAt {
					year
					month
					day
				}
				completedAt {
					year
					month
					day
				}
			}
		}
	}`.replace(/\n\t+/g, " ");

interface AnilistPersistResponse {
	data: {
		SaveMediaListEntry: SaveMediaListEntry;
	};
}

const PERSIST_QUERY = `
	mutation ($mediaId:Int $status:MediaListStatus $score:Float $scoreRaw:Int $progress:Int $progressVolumes:Int $startedAt:FuzzyDateInput $completedAt:FuzzyDateInput) {
		SaveMediaListEntry (mediaId:$mediaId status:$status score:$score scoreRaw:$scoreRaw progress:$progress progressVolumes:$progressVolumes startedAt:$startedAt completedAt:$completedAt) {
			id
			mediaId
			status
			score(format: POINT_100)
			progress
			progressVolumes
			startedAt {
				year
				month
				day
			}
			completedAt {
				year
				month
				day
			}
		}
	}`.replace(/\n\t+/g, " ");

interface AnilistDeleteResponse {
	data: {
		DeleteMediaListEntry: {
			deleted: boolean;
		};
	};
}

const DELETE_QUERY = `
	mutation ($id:Int) {
		DeleteMediaListEntry (id:$id) {
			deleted
		}
	}`.replace(/\n\t+/g, " ");

interface AnilistSearchResponse {
	data: {
		manga: {
			results: {
				id: number;
				title: {
					userPreferred: string;
				};
				coverImage?: {
					medium: string;
				};
			}[];
		};
	};
}

const SEARCH_QUERY = `
	query ($search: String $page:Int) {
		manga: Page(page:$page perPage: 10) {
			results: media(type: MANGA, search: $search) {
				id
				title {
					userPreferred
				}
				coverImage {
					medium
				}
			}
		}
	}`.replace(/\n\t+/g, " ");

class Anilist_ extends APIService {
	name = "Anilist";
	key = "al";
	url = "https://anilist.co/";
	apiUrl = "https://graphql.anilist.co";

	theme = {
		background: "rgb(31, 38, 49)",
		color: "rgb(2, 169, 255)",
	};

	headers(token: Token) {
		return {
			Authorization: `Bearer ${token.token}`,
			"Content-Type": "application/json",
			Accept: "application/json",
		};
	}

	async validToken(): Promise<Token | false> {
		const token = await this.storage.get<Token>();
		if (!token || !token.token) return false;
		if (token.expires && DateTime.fromMillis(token.expires) <= DateTime.now()) {
			return false;
		}
		return token as Token;
	}

	async status() {
		const token = await this.validToken();
		if (!token) {
			return {
				status: ServiceStatus.INVALID_TOKEN,
				message: "Failed to get token",
			};
		} else if (token.expires && DateTime.fromMillis(token.expires) <= DateTime.now()) {
			return {
				status: ServiceStatus.INVALID_TOKEN,
				message: "Token expired",
			};
		} else if (!token.token) {
			return { status: ServiceStatus.MISSING_TOKEN };
		}
		const response = await Volcano.post<AnilistViewerResponse>(this.apiUrl, {
			headers: this.headers(token),
			body: JSON.stringify({ query: `query { Viewer { id name } }` }),
		});
		if (response.status == 401) {
			return { status: ServiceStatus.INVALID_TOKEN };
		} else if (response.status >= 400 && response.status < 500) {
			return { status: ServiceStatus.TACHIKOMA_ERROR };
		} else if (response.ok && response.body) {
			return { status: ServiceStatus.LOGGED_IN, user: response.body.data.Viewer.name };
		}
		return { status: ServiceStatus.SERVICE_ERROR };
	}

	async loginRedirect(): Promise<string> {
		return this.route(`api/v2/oauth/authorize?client_id=${CLIENT_ID}&response_type=token`, true);
	}

	async login(informations: ServiceLoginInformations): Promise<{ status: ServiceLogin; message?: string }> {
		if (!informations.access_token || !informations.expires_in) {
			return { status: ServiceLogin.MISSING_FIELDS };
		}
		await this.storage.set<Token>({
			token: informations.access_token,
			expires: DateTime.now().plus({ seconds: informations.expires_in }).toMillis(),
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
			case ListStatus.REREADING:
				return Status.REREADING;
			case ListStatus.COMPLETED:
				return Status.COMPLETED;
			case ListStatus.PAUSED:
				return Status.PAUSED;
			case ListStatus.PLAN_TO_READ:
				return Status.PLAN_TO_READ;
			case ListStatus.DROPPED:
				return Status.DROPPED;
		}
		// WONT_READ is not available on Anilist
		return Status.NONE;
	}

	fromStatus(status: Status): ListStatus | null {
		switch (status) {
			case Status.READING:
				return ListStatus.READING;
			case Status.REREADING:
				return ListStatus.REREADING;
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

	dateFromAnilist(date: AnilistDate): DateTime | undefined {
		if (date.day !== null && date.month !== null && date.year !== null) {
			return DateTime.fromObject({ year: date.year, month: Math.max(0, date.month), day: date.day });
		}
		return undefined;
	}

	dateToAnilist(date?: DateTime): AnilistDate | null {
		if (date !== undefined) {
			return { day: date.day, month: date.month, year: date.year };
		}
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
		} else if (!token.token) {
			return { status: ExternalStatus.ACCOUNT_ERROR };
		}

		const response = await Volcano.post<AnilistGetResponse>(this.apiUrl, {
			headers: this.headers(token),
			body: JSON.stringify({
				query: GET_QUERY,
				variables: {
					mediaId: parseInt(id.id),
				},
			}),
		});
		if (response.status >= 401 && response.status <= 403) {
			return { status: ExternalStatus.ACCOUNT_ERROR };
		} else if (!response.body || response.status >= 500) {
			return { status: ExternalStatus.SERVICE_ERROR };
		}

		if (response.body.data.Media.mediaListEntry) {
			const media = response.body.data.Media;
			const userMedia = media.mediaListEntry!;
			return new Title({
				name: media.title.userPreferred,
				chapter: userMedia.progress,
				volume: userMedia.progressVolumes,
				status: this.toStatus(userMedia.status),
				score: userMedia.score ? new Score(userMedia.score, [1, 100]) : undefined,
				startDate: userMedia.startedAt ? this.dateFromAnilist(userMedia.startedAt) : undefined,
				endDate: userMedia.completedAt ? this.dateFromAnilist(userMedia.completedAt) : undefined,
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
		} else if (!token.token) {
			return { status: SaveStatus.ACCOUNT_ERROR };
		}

		const created = title.status === Status.NONE; // ???
		const response = await Volcano.post<AnilistPersistResponse>(this.apiUrl, {
			headers: this.headers(token),
			body: JSON.stringify({
				query: PERSIST_QUERY,
				variables: {
					mediaId: parseInt(id.id),
					status: this.fromStatus(title.status),
					scoreRaw: title.score ? title.score.get([0, 100]) : undefined,
					progress: Math.floor(title.chapter),
					progressVolumes: title.volume,
					startedAt: this.dateToAnilist(title.startDate),
					completedAt: this.dateToAnilist(title.endDate),
				},
			}),
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
		} else if (!token.token) {
			return { status: DeleteStatus.ACCOUNT_ERROR };
		}

		// We need to get the Anilist MediaEntryId
		// -- delete shouldn't happen often and an extra request is better than storing it
		const response = await Volcano.post<AnilistGetResponse>(this.apiUrl, {
			headers: this.headers(token),
			body: JSON.stringify({
				query: GET_QUERY,
				variables: {
					mediaId: parseInt(id.id),
				},
			}),
		});
		if (response.status >= 401 && response.status <= 403) {
			return { status: DeleteStatus.ACCOUNT_ERROR };
		} else if (!response.body || response.status >= 500) {
			return { status: DeleteStatus.SERVICE_ERROR };
		}

		const mediaEntryId = response.body.data.Media.mediaListEntry?.id;
		if (!mediaEntryId) {
			return { status: DeleteStatus.NOT_IN_LIST };
		}

		await Volcano.post<AnilistDeleteResponse>(this.apiUrl, {
			headers: this.headers(token),
			body: JSON.stringify({
				query: DELETE_QUERY,
				variables: {
					id: mediaEntryId,
				},
			}),
		});
		if (response.status >= 401 && response.status <= 403) {
			return { status: DeleteStatus.ACCOUNT_ERROR };
		} else if (!response.body || response.status >= 500) {
			return { status: DeleteStatus.SERVICE_ERROR };
		}

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
		} else if (!token.token) {
			return { status: SearchStatus.ACCOUNT_ERROR };
		}

		if (!page) page = 1;
		const response = await Volcano.post<AnilistSearchResponse>(this.apiUrl, {
			headers: this.headers(token),
			body: JSON.stringify({
				query: SEARCH_QUERY,
				variables: { search: query, page: page ?? 1 },
			}),
		});

		if (response.status >= 401 && response.status <= 403) {
			return { status: SearchStatus.ACCOUNT_ERROR };
		} else if (!response.body || response.status >= 500) {
			return { status: SearchStatus.SERVICE_ERROR };
		}

		return response.body.data.manga.results.map((title) => ({
			name: title.title.userPreferred,
			thumbnail: title.coverImage?.medium,
			identifier: { id: title.id },
		}));
	}
}
export default new Anilist_();
