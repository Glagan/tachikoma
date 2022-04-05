import Title from "./Title";

export default abstract class Service {
	abstract name: string;
	abstract key: string;
	theme?: { background: string; color?: string; title?: () => HTMLElement };

	abstract isLoggedIn(): Promise<boolean>;

	abstract areDifferent(title: TitleInterface, other: TitleInterface): boolean;

	abstract get(id: TitleIdentifier): Promise<Title | null>;
	abstract save(id: TitleIdentifier, title: Title): Promise<boolean>;
	abstract delete(id: TitleIdentifier): Promise<boolean>;

	link?(id: TitleIdentifier): string | undefined;
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
