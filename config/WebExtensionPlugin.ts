import { glob } from "glob";
import { Compiler } from "webpack";
import { Manifest, Entry } from "./ManifestTransformer";

export type Options = {
	usePackageVersion: boolean;
	usePackageName: boolean;
	exposeIcons: boolean;
	expose: string[];
};

export default class WebExtensionPlugin {
	manifest: Manifest;
	entries: Entry[];
	options: Options;

	static defaultOptions = {
		usePackageVersion: true,
		usePackageName: true,
		exposeIcons: true,
		expose: [],
	};

	constructor(manifest: Manifest, entries: Entry[], options: Partial<Options> = {}) {
		this.manifest = manifest;
		this.entries = entries;
		this.options = { ...WebExtensionPlugin.defaultOptions, ...options };
	}

	getReference(path: string): [object, string] {
		let reference: any = this.manifest;
		let links = path.split(".");
		let finalkey = links.splice(-1, 1)[0];
		for (const link of links) {
			if (this.manifest[link]) {
				reference = this.manifest[link];
			} else {
				break;
			}
		}
		return [reference, finalkey];
	}

	resetManifest() {
		let staticAssets: string[] = [];
		// * Add static assets from `icons` and `browser_action.default_icon`
		if (this.options.exposeIcons) {
			// * Add `icons` as assets
			if (this.manifest.icons) {
				staticAssets.push(...Object.values(this.manifest.icons));
			}
			// * Add `browser_action.default_icon` as assets
			if (this.manifest.browser_action?.default_icon) {
				staticAssets.push(...Object.values(this.manifest.browser_action.default_icon));
			}
		}
		// * Reset web_accessible_resources
		if (!this.manifest.web_accessible_resources) {
			if (this.manifest.manifest_version == 2) {
				this.manifest.web_accessible_resources = [];
			} else {
				this.manifest.web_accessible_resources = [
					{
						resources: [],
						matches: ["<all_urls>"],
					},
				];
			}
		}
		if (
			this.manifest.manifest_version == 3 &&
			Array.isArray(this.manifest.web_accessible_resources) &&
			this.manifest.web_accessible_resources.length == 0
		) {
			this.manifest.web_accessible_resources = [
				{
					resources: [],
					matches: ["<all_urls>"],
				},
			];
		}
		// * Add manually added path from the `expose` option
		if (this.options.expose.length > 0) {
			for (const path of this.options.expose) {
				const paths: string[] = glob.sync(path);
				for (const path of paths) {
					staticAssets.push(path);
				}
			}
		}
		// * Reset web_accessible_resources and add static assets
		staticAssets = Array.from(new Set(staticAssets));
		this.manifest.web_accessible_resources = [];
		if (this.manifest.manifest_version == 2) {
			(this.manifest.web_accessible_resources as string[]).push(...staticAssets);
		} else {
			this.manifest.web_accessible_resources[0].resources.push(...staticAssets);
		}
		// * Reset scripts file references
		for (const entry of this.entries) {
			let [reference, key] = this.getReference(entry.path);
			if (entry.mode == "script") {
				reference[key] = "";
			} else if (entry.mode == "script_list") {
				reference[key] = [];
			} else {
				if (reference[key].js) {
					delete reference[key].js;
				}
				if (reference[key].css) {
					delete reference[key].css;
				}
			}
		}
	}

	apply(compiler: Compiler) {
		const pluginName = WebExtensionPlugin.name;
		const { webpack } = compiler;
		const { RawSource } = webpack.sources;
		const { options } = this;

		// * Update the `version` key to use the package.json version
		if (options.usePackageVersion) {
			const version = process.env.npm_package_version;
			if (version) {
				this.manifest.version = version;
			} else {
				this.manifest.version = "missing_package_version";
			}
		}

		// * Set the `name` key to use the package.json version
		if (options.usePackageName) {
			const name = process.env.npm_package_name;
			if (name) {
				this.manifest.name = name;
			} else {
				this.manifest.name = "missing_package_name";
			}
		}

		compiler.hooks.thisCompilation.tap(pluginName, (thisCompilation) => {
			// Reset update manifest values to avoid duplicates in watch mode
			thisCompilation.hooks.processAssets.tap(
				{ name: pluginName, stage: 100 /* Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE */ },
				() => {
					this.resetManifest();
				}
			);

			// Process each final chunks and get the list of files associated to each entry points
			thisCompilation.hooks.processAssets.tap(
				{ name: pluginName, stage: 5000 /* Compilation.PROCESS_ASSETS_STAGE_REPORT */ },
				() => {
					const chunks = thisCompilation.chunks;
					const rChunks = Array.from(chunks).reverse();
					for (const chunk of rChunks) {
						const files = Array.from(chunk.files);
						const auxFiles = Array.from(chunk.auxiliaryFiles);
						const scripts = files.filter((file) => file.endsWith(".js"));
						const styles = files
							.filter((file) => file.endsWith(".css"))
							.concat(auxFiles.filter((file) => file.endsWith(".css")));
						const otherAssets = files
							.filter((file) => scripts.indexOf(file) < 0 && styles.indexOf(file) < 0)
							.concat(auxFiles.filter((file) => scripts.indexOf(file) < 0 && styles.indexOf(file) < 0));
						// Collect runtimes or the entrypoint itself
						let runtimes: string[] = [];
						if (chunk.name) {
							runtimes.push(chunk.name);
						} else {
							if (!chunk.runtime) continue;
							if (typeof chunk.runtime === "string") {
								runtimes.push(chunk.runtime);
							} else {
								runtimes.push(...Array.from(chunk.runtime));
							}
						}
						// Check and assign each scripts and css files for each entrypoints
						for (const runtime of Array.from(runtimes!)) {
							let entry = this.entries.find((entry) => entry.name == runtime);
							if (!entry) continue;
							let [reference, key] = this.getReference(entry.path);
							if (entry.mode == "script") {
								reference[key] = scripts[0];
							} else if (entry.mode == "script_list") {
								reference[key].push(...scripts);
							} else {
								if (!reference[key].js) {
									reference[key].js = [];
								}
								reference[key].js.push(...scripts);
								if (styles.length > 0) {
									if (!reference[key].css) {
										reference[key].css = [];
									}
									reference[key].css.push(...styles);
								}
							}
						}
						// Add other assets (most likely fonts) to web_accessible_resources
						if (this.manifest.web_accessible_resources && otherAssets.length > 0) {
							// Remove timestamp from file
							const cleanAssets = otherAssets.map((file) => file.split("?")[0]);
							if (this.manifest.manifest_version == 2) {
								(this.manifest.web_accessible_resources as string[]).push(...cleanAssets);
							} else {
								this.manifest.web_accessible_resources[0].resources.push(...cleanAssets);
							}
						}
					}

					// * Add the final manifest.json to the output
					const manifestStr = JSON.stringify(this.manifest);
					thisCompilation.emitAsset("manifest.json", new RawSource(manifestStr));
				}
			);
		});
	}
}
