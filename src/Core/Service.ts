import { Shelf } from "./Shelf";
import Title from "./Title";

export default abstract class Service {
	abstract name: string;
	abstract key: string;
	theme?: { background: string; color?: string; title?: () => HTMLElement };
	abstract url: string;
	apiUrl?: string;

	loginRedirect?(): Promise<string>;
	abstract isLoggedIn(): Promise<boolean>;

	abstract areDifferent(title: TitleInterface, other: TitleInterface): boolean;

	abstract get(id: TitleIdentifier): Promise<Title | null>;
	abstract save(id: TitleIdentifier, title: Title): Promise<boolean>;
	abstract delete(id: TitleIdentifier): Promise<boolean>;

	route(path: string, useBaseUrl: boolean = false): string {
		const base = !useBaseUrl && this.apiUrl ? this.apiUrl : this.url;
		if (path.startsWith("/")) path = path.slice(1);
		return `${base}${path}`;
	}
	link?(id: TitleIdentifier): string | undefined;

	storage = {
		get: async <Values extends Record<string, any>>(): Promise<Partial<Values>> => {
			const result = Shelf.get(`$${this.key}`) as unknown as Values | undefined;
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
	abstract login(informations: ServiceLoginInformations): Promise<boolean>;
	abstract logout(): Promise<boolean>;
}

/**
 * Service that doesn't have a token or an API and use users cookies.
 */
export class CookieService {}
