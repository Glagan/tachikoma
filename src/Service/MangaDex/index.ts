import { APIService } from "@Core/Service";
import Title from "@Core/Title";
import { ServiceStorage } from "@Core/ServiceStorage";
import { Volcano } from "@Core/Volcano";

declare const API_URL = "https://api.mangadex.org/";

type Token = {
	session: string;
	refresh: string;
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

/***
 * Only the `status` is currently available on MangaDex.
 */
export default new (class MangaDex extends APIService {
	name = "MangaDex";
	key = "md";

	theme = {
		background: "rgb(44, 44, 44)",
		color: "rgb(255, 103, 64)",
	};

	headers(token: string) {
		return {
			Authorization: `Bearer ${token}`,
			Accept: "application/json",
		};
	}

	url(route: string): string {
		if (route.startsWith("/")) route = route.slice(1);
		return `${API_URL}${route}`;
	}

	async isLoggedIn() {
		const token = await ServiceStorage.get<Token>(this.key);
		if (!token || !token.session) return false;
		const response = await Volcano.post<{
			result: string;
			isAuthenticated: boolean;
			roles: string[];
			permissions: string[];
		}>(this.url("/auth/check"), { headers: this.headers(token.session) });
		if (response.ok && response.body?.isAuthenticated) {
			return true;
		}
		return false;
	}

	async refreshToken(): Promise<boolean> {
		const token = await ServiceStorage.get<Token>(this.key);
		if (!token || !token.refresh) return false;
		const response = await Volcano.post<{
			result: string;
			token: {
				session: string;
				refresh: string;
			};
		}>(this.url("auth/refresh"), {
			body: { token: token.refresh },
		});
		if (response.status >= 401 || response.status <= 403) {
			return false;
		}
		if (!response.body) {
			return false;
		}
		await ServiceStorage.set<Token>(this.key, {
			session: response.body.token.session,
			refresh: response.body.token.refresh,
		});
		return true;
	}

	async login(informations: ServiceLoginInformations): Promise<boolean> {
		if (!informations.username || !informations.password) {
			return false;
		}
		const response = await Volcano.post<{
			result: string;
			token: {
				session: string;
				refresh: string;
			};
		}>(this.url("auth/login"), {
			body: {
				username: informations.username,
				password: informations.password,
			},
		});
		if (response.status == 401) return false;
		if (!response.body) {
			return false;
		}
		await ServiceStorage.set<Token>(this.key, {
			session: response.body.token.session,
			refresh: response.body.token.refresh,
		});
		return true;
	}

	async logout(): Promise<boolean> {
		const token = await ServiceStorage.get<Token>(this.key);
		// If the request failed (invalid token or expired) then the sessions is already "disconnected"
		// So we can safely ignore the error and just remove the stored tokens
		if (token && token.session) {
			await Volcano.post(this.url("auth/logout"), {
				headers: this.headers(token.session),
			});
		}
		await ServiceStorage.remove(this.key);
		return true;
	}

	areDifferent(title: TitleInterface, other: TitleInterface): boolean {
		// Only the status is currently saved in MangaDex
		if (title.status != other.status) {
			return true;
		}
		return false;
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

	async get(id: TitleIdentifier): Promise<Title | null> {
		if (!id.id) return null;
		const token = await ServiceStorage.get<Token>(this.key);
		if (!token || !token.session) return null;

		const response = await Volcano.get<
			{
				result: "ok";
				status: ListStatus;
			},
			ResponseError
		>(this.url(`manga/${id.id}/status`), { headers: this.headers(token.session) });

		if (response.status >= 401 || response.status <= 403) {
			return null;
		}
		if (!response.body || response.body.result == "error") {
			return null;
		}

		return new Title({
			chapter: 0,
			services: { [this.key]: id },
			status: this.toStatus(response.body.status),
		});
	}

	async save(id: TitleIdentifier, title: Title): Promise<boolean> {
		if (!id.id) return false;
		const token = await ServiceStorage.get<Token>(this.key);
		if (!token || !token.session) return false;

		const response = await Volcano.post<{ result: "ok" }, ResponseError>(this.url(`manga/${id.id}/status`), {
			headers: this.headers(token.session),
			body: { status: this.fromStatus(title.status) },
		});

		return response.ok && response.body?.result === "ok";
	}

	async delete(id: TitleIdentifier): Promise<boolean> {
		if (!id.id) return false;
		const token = await ServiceStorage.get<Token>(this.key);
		if (!token || !token.session) return false;

		// Only the status is currently available on MangaDex
		// So "deleting" the title only means setting it's status to null
		const response = await Volcano.post<{ result: "ok" }, ResponseError>(this.url(`manga/${id.id}/status`), {
			headers: this.headers(token.session),
			body: { status: null },
		});

		return response.ok && response.body?.result === "ok";
	}

	link(id: TitleIdentifier): string | undefined {
		if (!id.id) return undefined;
		return `https://mangadex.org/title/${id.id}`;
	}
})();
