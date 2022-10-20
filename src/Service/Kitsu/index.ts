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
	LoginField,
} from "@Core/Service";
import { Volcano } from "@Core/Volcano";
import Title, { Status, TitleInterface } from "@Core/Title";
import { Score } from "@Core/Score";

type Token = {
	token: string;
	refresh: string;
	expires: number;
	userId: number;
};

export const enum ListStatus {
	NONE = "none",
	READING = "current",
	COMPLETED = "completed",
	PAUSED = "on_hold",
	DROPPED = "dropped",
	PLAN_TO_READ = "planned",
}

interface KitsuLoginResponse {
	access_token: string;
	created_at: number;
	expires_in: number;
	refresh_token: string;
	scope: "public";
	token_type: "bearer";
}

interface KitsuUserResponse {
	data: {
		id: string;
		type: "users";
		links: {};
		attributes: {
			name: string;
		};
		relationships: {};
	}[];
	meta: {};
	links: {};
}

export interface KitsuManga {
	id: string;
	type: "manga";
	links: {};
	attributes: {
		chapterCount: number;
		volumeCount: number;
		canonicalTitle: string;
	};
}

interface KitsuLibraryEntryAttributes {
	status: ListStatus;
	progress: number;
	volumesOwned: number;
	reconsuming: boolean;
	reconsumeCount: number;
	notes: string | null;
	private: boolean;
	reactionSkipped: "unskipped" | "skipped" | "ignored";
	rating: string;
	ratingTwenty: number | null;
	startedAt: string | null;
	finishedAt: string | null;
	progressedAt: string | null;
}

interface KitsuLibraryEntry {
	id: string;
	type: "libraryEntries";
	links: {};
	attributes: KitsuLibraryEntryAttributes;
	relationships: {
		manga: {
			links: {};
			data?: {
				type: "manga";
				id: string;
			};
		};
	};
}

export interface KitsuGetResponse {
	data: KitsuLibraryEntry[];
	included: KitsuManga[];
	errors?: any;
	meta: {
		statusCounts: {
			current?: number;
			planned?: number;
			completed?: number;
			onHold?: number;
			dropped?: number;
		};
		count: number;
	};
	links: {};
}

interface KitsuPersistResponse {
	data: KitsuLibraryEntry;
}

class Kitsu_ extends APIService {
	name = "Kitsu";
	key = "ku";
	url = "https://kitsu.io/";
	apiUrl = "https://kitsu.io/api/edge/library-entries";

	libraryEntryCache: { [key: string]: { [key: number]: number | undefined } } = {};

	theme = {
		background: "rgb(64, 47, 63)",
		color: "rgb(255, 255, 255)",
	};

	loginInformations: LoginField[] = [
		{
			type: "email",
			name: "email",
			label: "Email",
		},
		{
			type: "password",
			name: "password",
			label: "Password",
		},
	];

	headers(token: Partial<Token>) {
		return {
			Accept: "application/vnd.api+json",
			"Content-Type": "application/vnd.api+json",
			Authorization: `Bearer ${token.token}`,
		};
	}

	async validToken(): Promise<Partial<Token> | false> {
		const token = await this.storage.get<Token>();
		if (!token || !token.token || !token.userId) {
			return false;
		}
		if (token.expires && DateTime.fromMillis(token.expires) >= DateTime.now()) {
			return token;
		}
		if (!token.refresh) return false;

		const response = await Volcano.post<KitsuLoginResponse>("https://kitsu.io/api/oauth/token", {
			headers: {
				Accept: "application/vnd.api+json",
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(token.refresh)}`,
		});
		if (!response.ok || !response.body) {
			return false;
		}
		const refreshedToken: Token = {
			token: response.body.access_token,
			refresh: response.body.refresh_token,
			expires: DateTime.now().plus({ milliseconds: response.body.expires_in }).toMillis(),
			userId: token.userId!,
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

		const response = await Volcano.get<KitsuUserResponse>("https://kitsu.io/api/edge/users?filter[self]=true", {
			headers: {
				Authorization: `Bearer ${token.token}`,
				Accept: "application/vnd.api+json",
			},
		});

		if (response.status == 401) {
			return { status: ServiceStatus.INVALID_TOKEN };
		} else if (response.status >= 400 && response.status < 500) {
			return { status: ServiceStatus.TACHIKOMA_ERROR };
		}
		if (response.ok && response.body) {
			return { status: ServiceStatus.LOGGED_IN, user: response.body.data[0].attributes.name };
		}
		return { status: ServiceStatus.SERVICE_ERROR };
	}

	async getUserId(token: string): Promise<number | undefined> {
		let response = await Volcano.get<KitsuUserResponse>("https://kitsu.io/api/edge/users?filter[self]=true", {
			headers: this.headers({ token } as Token),
		});
		if (!response.ok || !response.body) {
			return undefined;
		}
		const userId = parseInt(response.body.data[0].id);
		if (isNaN(userId)) {
			return undefined;
		}
		return userId;
	}

	async login(informations: ServiceLoginInformations): Promise<{ status: ServiceLogin; message?: string }> {
		if (!informations.email || !informations.password) {
			return { status: ServiceLogin.MISSING_FIELDS };
		}

		const response = await Volcano.post<KitsuLoginResponse>("https://kitsu.io/api/oauth/token", {
			headers: {
				Accept: "application/vnd.api+json",
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: `grant_type=password&username=${encodeURIComponent(informations.email)}&password=${encodeURIComponent(
				informations.password
			)}`,
		});
		if (response.status >= 400 && response.status < 500) {
			return { status: ServiceLogin.TACHIKOMA_ERROR };
		} else if (!response.body || response.status >= 500) {
			return { status: ServiceLogin.SERVICE_ERROR };
		}
		if (!response.ok || !response.body) {
			return { status: ServiceLogin.INVALID_CREDENTIALS };
		}

		let tmpToken = response.body.access_token;
		const userId = await this.getUserId(tmpToken);
		if (!userId) {
			return { status: ServiceLogin.TACHIKOMA_ERROR };
		}
		await this.storage.set<Token>({
			token: response.body.access_token,
			refresh: response.body.refresh_token,
			expires: DateTime.now().plus({ seconds: response.body.expires_in }).toMillis(),
			userId,
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
			case ListStatus.NONE:
				return Status.NONE;
			case ListStatus.READING:
				return Status.READING;
			case ListStatus.COMPLETED:
				return Status.COMPLETED;
			case ListStatus.PAUSED:
				return Status.PAUSED;
			case ListStatus.DROPPED:
				return Status.DROPPED;
			case ListStatus.PLAN_TO_READ:
				return Status.PLAN_TO_READ;
		}
		// WONT_READ is not available on Kitsu
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
			case Status.DROPPED:
				return ListStatus.DROPPED;
			case Status.PLAN_TO_READ:
				return ListStatus.PLAN_TO_READ;
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
		} else if (!token.token || !token.userId) {
			return { status: ExternalStatus.ACCOUNT_ERROR };
		}

		const response = await Volcano.get<KitsuGetResponse>(
			this.route(
				`?filter[manga_id]=${id.id}&filter[user_id]=${token.userId}&include=manga&fields[manga]=chapterCount,volumeCount,canonicalTitle`
			),
			{
				headers: this.headers(token),
			}
		);
		if (response.status >= 401 && response.status <= 403) {
			return { status: ExternalStatus.ACCOUNT_ERROR };
		} else if (!response.body || response.status >= 500) {
			return { status: ExternalStatus.SERVICE_ERROR };
		}

		if (response.body.data.length == 1) {
			const attributes = response.body.data[0].attributes;
			return new Title({
				name: response.body.included[0].attributes.canonicalTitle,
				chapter: attributes.progress,
				volume: attributes.volumesOwned > 0 ? attributes.volumesOwned : undefined,
				status: this.toStatus(attributes.status),
				score: attributes.ratingTwenty ? new Score(attributes.ratingTwenty, [0, 20]) : undefined,
				startDate: attributes.startedAt ? DateTime.fromISO(attributes.startedAt) : undefined,
				endDate: attributes.finishedAt ? DateTime.fromISO(attributes.finishedAt) : undefined,
				lastAccess: DateTime.now(),
				relations: { [this.key]: id },
			});
		}
		return { status: ExternalStatus.NOT_IN_LIST };
	}

	async save(id: TitleIdentifier, title: Title): Promise<SaveResult> {
		if (!id.id) return { status: SaveStatus.ACCOUNT_ERROR };
		const token = await this.validToken();
		if (!token) {
			return {
				status: SaveStatus.ACCOUNT_ERROR,
				message: "Failed to refresh token",
			};
		} else if (!token.token || !token.userId) {
			return { status: SaveStatus.ACCOUNT_ERROR };
		}

		const libraryEntryId = this.libraryEntryCache[token.token]?.[id.id]
			? this.libraryEntryCache[token.token][id.id]!
			: 0;
		const method = libraryEntryId > 0 ? "patch" : "post";
		const url = this.route(libraryEntryId > 0 ? `/${libraryEntryId}` : "");

		const created = title.status === Status.NONE; // ???
		const response = await Volcano[method]<KitsuPersistResponse>(url, {
			headers: this.headers(token),
			body: JSON.stringify({
				data: {
					id: libraryEntryId > 0 ? libraryEntryId : undefined,
					attributes: {
						status: this.fromStatus(title.status),
						progress: Math.floor(title.chapter),
						volumesOwned: title.volume,
						// Convert 0-100 score to the 0-20 range -- round to the nearest
						ratingTwenty: title.score ? title.score.get([0, 20]) : undefined,
						startedAt: title.startDate ? title.startDate.toISO() : null,
						finishedAt: title.endDate ? title.endDate.toISO() : null,
					},
					relationships: {
						manga: {
							data: {
								type: "manga",
								id: id.id,
							},
						},
						user: {
							data: {
								type: "users",
								id: token.userId,
							},
						},
					},
					type: "library-entries",
				},
			}),
		});
		if (response.status >= 401 && response.status <= 403) {
			return { status: SaveStatus.ACCOUNT_ERROR };
		} else if (!response.body || response.status >= 500) {
			return { status: SaveStatus.SERVICE_ERROR };
		}

		if (response.body) {
			if (!this.libraryEntryCache[token.token]) {
				this.libraryEntryCache[token.token] = {};
			}
			this.libraryEntryCache[token.token][id.id] = parseInt(response.body.data.id);
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
		} else if (!token.token || !token.userId) {
			return { status: DeleteStatus.ACCOUNT_ERROR };
		}

		let libraryEntryId = this.libraryEntryCache[token.token]?.[id.id]
			? this.libraryEntryCache[token.token][id.id]!
			: 0;
		// ? If there is no library entry ID, try to get it
		if (!libraryEntryId) {
			const response = await Volcano.get<KitsuGetResponse>(
				this.route(`?filter[manga_id]=${id.id}&filter[user_id]=${token.userId}`),
				{
					headers: this.headers(token),
				}
			);
			if (response.status >= 401 && response.status <= 403) {
				return { status: DeleteStatus.ACCOUNT_ERROR };
			} else if (!response.body || response.status >= 500) {
				return { status: DeleteStatus.SERVICE_ERROR };
			}

			if (response.body.data.length === 1) {
				libraryEntryId = parseInt(response.body.data[0].id);
			}
		}

		// If the title is just not on the service, nothing is done
		if (!libraryEntryId) {
			return { status: DeleteStatus.NOT_IN_LIST };
		}

		const response = await Volcano.deleteRequest(`https://kitsu.io/api/edge/library-entries/${libraryEntryId}`, {
			headers: this.headers(token),
		});
		if (response.status >= 401 && response.status <= 403) {
			return { status: DeleteStatus.ACCOUNT_ERROR };
		} else if (!response.body || response.status >= 500) {
			return { status: DeleteStatus.SERVICE_ERROR };
		}

		// We can safely delete the library entry ID, since even on cancel it will generate a new one
		if (this.libraryEntryCache[token.token]) {
			delete this.libraryEntryCache[token.token][id.id];
		}
		return { status: DeleteStatus.SUCCESS };
	}

	link(id: TitleIdentifier): string | undefined {
		if (!id.id) return undefined;
		return this.route(`manga/${id.id}`, true);
	}
}
export default new Kitsu_();
