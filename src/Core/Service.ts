import { Shelf } from "./Shelf";
import type Title from "./Title";
import type { TitleInterface } from "./Title";

export enum ServiceStatus {
	MISSING_TOKEN, // Missing tokens in API services
	MISSING_COOKIES, // Missing cookies in non-API services
	INVALID_TOKEN, // After a service login check
	SERVICE_ERROR, // 500+
	TACHIKOMA_ERROR, // 400-499
	LOADING, // Spin around
	LOGGED_IN, // Success
}

export const loginStatusMap: { [key in ServiceStatus]: string } = {
	[ServiceStatus.MISSING_TOKEN]: "Missing Token",
	[ServiceStatus.MISSING_COOKIES]: "Missing Cookies",
	[ServiceStatus.INVALID_TOKEN]: "Invalid or expired Token",
	[ServiceStatus.SERVICE_ERROR]: "Service Unavailable",
	[ServiceStatus.TACHIKOMA_ERROR]: "Bad Request",
	[ServiceStatus.LOADING]: "Loading...",
	[ServiceStatus.LOGGED_IN]: "Logged In",
};

export enum ServiceLogin {
	MISSING_FIELDS,
	EXPIRED_CHALLENGE,
	INVALID_CREDENTIALS,
	INVALID_CHALLENGE,
	SERVICE_ERROR, // 500+
	TACHIKOMA_ERROR, // 400-499
	LOADING, // Spin around
	SUCCESS,
}

export const loginResultMap: { [key in ServiceLogin]: string } = {
	[ServiceLogin.MISSING_FIELDS]: "Missing field value",
	[ServiceLogin.EXPIRED_CHALLENGE]: "Challenge expired",
	[ServiceLogin.INVALID_CREDENTIALS]: "Invalid credentials",
	[ServiceLogin.INVALID_CHALLENGE]: "Invalid challenge",
	[ServiceLogin.SERVICE_ERROR]: "Service Unavailable",
	[ServiceLogin.TACHIKOMA_ERROR]: "Bad Request",
	[ServiceLogin.LOADING]: "Loading...",
	[ServiceLogin.SUCCESS]: "Logged In",
};

export enum ExternalStatus {
	ID_ERROR, // Invalid given ID format
	ACCOUNT_ERROR, // Any Token, Cookies or expired tokens error
	SERVICE_ERROR, // 500+
	TACHIKOMA_ERROR, // 400-499
	NO_SERVICE, // tachikoma doesn't know this service
	NO_ID, // No saved ID
	NOT_IN_LIST, // Not currently in list
	LOADING,
}

export type TitleFetchFailure = {
	status: ExternalStatus;
	service?: ServiceStatus;
	message?: string;
};

export enum SaveStatus {
	ID_ERROR = 0x00, // Invalid given ID format
	ACCOUNT_ERROR, // Any Token, Cookies or expired tokens error
	SERVICE_ERROR, // 500+
	TACHIKOMA_ERROR, // 400-499
	SUCCESS,
	ALREADY_SYNCED,
	DELETED, // Status.NONE
	CREATED, // 201 -- or create
	LOADING,
}

export const saveStatusDescription: Record<SaveStatus, string> = {
	[SaveStatus.ID_ERROR]: "Invalid Service ID", // Invalid given ID format
	[SaveStatus.ACCOUNT_ERROR]: "Service connection expired", // Any Token, Cookies or expired tokens error
	[SaveStatus.SERVICE_ERROR]: "Service server error", // 500+
	[SaveStatus.TACHIKOMA_ERROR]: "Tachikoma Error", // 400-499
	[SaveStatus.SUCCESS]: "Success",
	[SaveStatus.ALREADY_SYNCED]: "Synced",
	[SaveStatus.DELETED]: "Deleted", // Status.NONE
	[SaveStatus.CREATED]: "Created", // 201 -- or create
	[SaveStatus.LOADING]: "Loading",
};

export type SaveResult = {
	status: SaveStatus;
	message?: string;
};

export enum DeleteStatus {
	ID_ERROR = 0x10, // Invalid given ID format
	ACCOUNT_ERROR, // Any Token, Cookies or expired tokens error
	SERVICE_ERROR, // 500+
	TACHIKOMA_ERROR, // 400-499
	NOT_IN_LIST, // 404 ?
	SUCCESS,
	LOADING,
}

export const deleteStatusDescription: Record<DeleteStatus, string> = {
	[DeleteStatus.ID_ERROR]: "Invalid Service ID", // Invalid given ID format
	[DeleteStatus.ACCOUNT_ERROR]: "Service connection expired", // Any Token, Cookies or expired tokens error
	[DeleteStatus.SERVICE_ERROR]: "Service server error", // 500+
	[DeleteStatus.NOT_IN_LIST]: "Not in list", // 404 ?
	[DeleteStatus.TACHIKOMA_ERROR]: "Tachikoma Error", // 400-499
	[DeleteStatus.SUCCESS]: "Success",
	[DeleteStatus.LOADING]: "Loading",
};

export type DeleteResult = {
	status: DeleteStatus;
	message?: string;
};

export enum SearchStatus {
	INVALID_QUERY = 0x20,
	INVALID_PAGE,
	ACCOUNT_ERROR, // Any Token, Cookies or expired tokens error
	SERVICE_ERROR, // 500+
	TACHIKOMA_ERROR, // 400-499
	SUCCESS,
	LOADING,
}

export type SearchTitle = {
	name: string;
	thumbnail?: string;
	publicationStatus?: string;
	description?: string;
	identifier: TitleIdentifier;
	external?: { [key: string]: TitleIdentifier };
};

export type SearchResult = {
	status: SearchStatus;
	message?: string;
};

export type AnyService = APIService | CookieService;
export type LoginField = { type: "text" | "email" | "password"; name: string; label: string; required?: boolean };

export type ComparableFields = "chapter" | "volume" | "status" | "score" | "startDate" | "endDate";

export default abstract class Service {
	abstract name: string;
	abstract key: string;
	theme?: { background: string; color?: string; title?: () => HTMLElement };
	abstract url: string;
	apiUrl?: string;
	loginInformations?: LoginField[];

	// Redirect URL if there is one for the service (also used for API authorizations)
	loginRedirect?(): Promise<string>;
	abstract status(): Promise<{ status: ServiceStatus; user?: string; message?: string }>;
	async isLoggedIn(): Promise<boolean> {
		const status = await this.status();
		return status.status == ServiceStatus.LOGGED_IN;
	}

	// Check if any of the given fields is different between the titles with a generic comparison
	protected fieldsNeedUpdate(title: TitleInterface, other: TitleInterface, fields: ComparableFields[]): boolean {
		for (const field of fields) {
			if (field === "startDate" || field === "endDate") {
				// Ignore anything below a day in Dates
				if (
					title[field]?.set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toMillis() !==
					other[field]?.set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toMillis()
				) {
					return true;
				}
			}
			// Handle volume 0 being equal to undefined
			else if (field === "volume") {
				return (
					(title.volume === undefined && other.volume !== undefined && other.volume > 0) ||
					(title.volume !== undefined && title.volume > 0 && other.volume === undefined) ||
					(title.volume !== undefined &&
						other.volume !== undefined &&
						title.volume !== other.volume &&
						other.volume > 0)
				);
			} else if (title[field] != other[field]) {
				return true;
			}
		}
		return false;
	}
	abstract needUpdate(title: TitleInterface, other: TitleInterface): boolean;

	abstract get(id: TitleIdentifier): Promise<Title | TitleFetchFailure>;
	abstract save(id: TitleIdentifier, title: Title): Promise<SaveResult>;
	abstract delete(id: TitleIdentifier): Promise<DeleteResult>;

	search?(query: string, page?: number): Promise<SearchResult | SearchTitle[]>;

	route(path: string, useBaseUrl: boolean = false): string {
		const base = !useBaseUrl && this.apiUrl ? this.apiUrl : this.url;
		if (path.startsWith("/")) path = path.slice(1);
		return `${base}${path}`;
	}
	link?(id: TitleIdentifier): string | undefined;

	storage = {
		get: async <Values extends Record<string, any>>(): Promise<Partial<Values>> => {
			const result = (await Shelf.get(`$${this.key}`)) as unknown as Values | undefined;
			if (result) return result;
			return {};
		},
		set: async <Values extends Record<string, any>>(value: Values): Promise<void> => {
			return Shelf.set(`$${this.key}`, value);
		},
		clear: async () => {
			return Shelf.remove(`$${this.key}`);
		},
	};
}

/**
 * Service that use a token or some has an API with authentication.
 */
export abstract class APIService extends Service {
	abstract login(informations: ServiceLoginInformations): Promise<{ status: ServiceLogin; message?: string }>;
	abstract logout(): Promise<boolean>;
}

/**
 * Service that doesn't have a token or an API and use users cookies.
 */
export abstract class CookieService extends Service {}
