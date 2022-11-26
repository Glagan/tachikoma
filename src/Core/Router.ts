type Route = {
	identifier: (string | RegExp)[];
	fnct: (() => Promise<any>) | ((results?: string[]) => Promise<any>) | (() => any) | ((results?: string[]) => any);
	meta?: Record<any, any>;
};

export default class Router {
	protected routes: Route[] = [];
	protected currentRoute: string | undefined;
	protected watcherBinded: boolean = false;
	public events: {
		beforeRoute?:
			| ((identifier: string, previous?: string) => Promise<void>)
			| ((identifier: string, previous?: string) => void);
		afterRoute?: ((identifier: string) => Promise<void>) | ((identifier: string) => void);
	} = {};

	public onBeforeRoute(
		callback:
			| ((identifier: string, previous?: string) => Promise<void>)
			| ((identifier: string, previous?: string) => void)
	) {
		this.events.beforeRoute = callback;
	}

	public onAfterRoute(callback: ((identifier: string) => Promise<void>) | ((identifier: string) => void)) {
		this.events.afterRoute = callback;
	}

	public add(identifier: string | RegExp | (string | RegExp)[], fnct: Route["fnct"], meta?: Route["meta"]) {
		if (!Array.isArray(identifier)) identifier = [identifier];
		this.routes.push({ identifier, fnct, meta });
	}

	public match(identifier: string): [Route, string[]] | null {
		for (const route of this.routes) {
			for (const id of route.identifier) {
				if (typeof id === "string") {
					if (id == identifier) {
						return [route, []];
					}
				} else {
					const results = id.exec(identifier);
					if (results) {
						return [route, results.slice(1)];
					}
				}
			}
		}
		return null;
	}

	public async execute(identifier?: string) {
		if (!identifier) identifier = window.location.pathname;
		const match = this.match(identifier);
		if (match) {
			if (this.events.beforeRoute) {
				await this.events.beforeRoute(identifier, this.currentRoute);
			}
			await match[0].fnct(match[1]);
			this.currentRoute = identifier;
			if (this.events.afterRoute) {
				await this.events.afterRoute(identifier);
			}
		}
		// Execute beforeRoute and reset currentRoute on inexisting routes
		else {
			if (this.events.beforeRoute) {
				await this.events.beforeRoute(identifier, this.currentRoute);
			}
			this.currentRoute = undefined;
		}
	}

	/**
	 * Default watcher which listen to "URL" change by watching any body mutation.
	 * @see https://stackoverflow.com/a/46428962/7794671
	 */
	protected bindWatcher() {
		if (this.watcherBinded) return;
		let oldHref = window.location.pathname;
		const body = document.querySelector("body")!;

		const observer = new MutationObserver(() => {
			const newIdentifier = window.location.pathname;
			if (oldHref != newIdentifier) {
				oldHref = newIdentifier;
				this.execute(newIdentifier);
			}
		});
		observer.observe(body, {
			childList: true,
			subtree: true,
		});

		this.watcherBinded = true;
	}

	public watch(watcher?: (execute: (identifier: string) => void) => void) {
		if (watcher) {
			if (!this.watcherBinded) {
				watcher(this.execute);
				this.watcherBinded = true;
			}
		} else {
			this.bindWatcher();
		}
	}
}
