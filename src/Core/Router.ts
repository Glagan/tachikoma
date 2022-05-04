type Route = {
	identifier: (string | RegExp)[];
	fnct: (() => Promise<any>) | ((results?: string[]) => Promise<any>) | (() => any) | ((results?: string[]) => any);
	meta?: Record<any, any>;
};

export default class Router {
	protected routes: Route[] = [];
	protected watcherBinded: boolean = false;

	public add(identifier: string | RegExp | (string | RegExp)[], fnct: Route["fnct"], meta?: Route["meta"]) {
		if (!Array.isArray(identifier)) identifier = [identifier];
		this.routes.push({ identifier, fnct, meta });
	}

	public match(identifier: string): [Route, string[]] | null {
		for (const route of this.routes) {
			let match: [Route, string[]] | null = null;
			for (const id of route.identifier) {
				if (typeof id === "string") {
					if (id == identifier) {
						match = [route, []];
						break;
					}
				} else {
					const results = id.exec(identifier);
					if (results) {
						match = [route, results.slice(1)];
						break;
					}
				}
			}
			if (match) return match;
		}
		return null;
	}

	public execute(identifier?: string) {
		if (!identifier) identifier = window.location.pathname;
		const match = this.match(identifier);
		if (match) match[0].fnct(match[1]);
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
			if (oldHref != window.location.pathname) {
				oldHref = window.location.pathname;
				this.execute(window.location.pathname);
			}
		});

		const config = {
			childList: true,
			subtree: true,
		};

		observer.observe(body, config);
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
