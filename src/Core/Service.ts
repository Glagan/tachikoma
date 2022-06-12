import { Shelf } from "./Shelf";
import type Title from "./Title";

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
	ID_ERROR, // Invalid given ID format
	ACCOUNT_ERROR, // Any Token, Cookies or expired tokens error
	SERVICE_ERROR, // 500+
	TACHIKOMA_ERROR, // 400-499
	SUCCESS,
	DELETED, // Status.NONE
	CREATED, // 201 -- or create
	LOADING,
}

export type SaveResult = {
	status: SaveStatus;
	message?: string;
};

export enum DeleteStatus {
	ID_ERROR, // Invalid given ID format
	ACCOUNT_ERROR, // Any Token, Cookies or expired tokens error
	SERVICE_ERROR, // 500+
	TACHIKOMA_ERROR, // 400-499
	NOT_IN_LIST, // 404 ?
	SUCCESS,
	LOADING,
}

export type DeleteResult = {
	status: DeleteStatus;
	message?: string;
};

export type AnyService = APIService | CookieService;
export type LoginField = { type: "text" | "email" | "password"; name: string; label: string; required?: boolean };

export default abstract class Service {
	abstract name: string;
	abstract key: string;
	theme?: { background: string; color?: string; title?: () => HTMLElement };
	abstract url: string;
	apiUrl?: string;
	loginInformations?: LoginField[];

	// Redirect URL if there is one for the service (also used for API authorizations)
	loginRedirect?(): Promise<string>;
	abstract status(): Promise<{ status: ServiceStatus; message?: string }>;
	async isLoggedIn(): Promise<boolean> {
		const status = await this.status();
		return status.status == ServiceStatus.LOGGED_IN;
	}

	abstract areDifferent(title: TitleInterface, other: TitleInterface): boolean;

	abstract get(id: TitleIdentifier): Promise<Title | TitleFetchFailure>;
	abstract save(id: TitleIdentifier, title: Title): Promise<SaveResult>;
	abstract delete(id: TitleIdentifier): Promise<DeleteResult>;

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
