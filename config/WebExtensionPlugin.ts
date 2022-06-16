import { Compiler } from "webpack";
import { Manifest, Resources } from "./ManifestTransformer";

export type Options = {
	usePackageVersion: boolean;
	usePackageName: boolean;
	exposeIcons: boolean;
};

export default class WebExtensionPlugin {
	manifest: Manifest;
	resources: Resources;
	options: Options;

	static defaultOptions = {
		usePackageVersion: true,
		usePackageName: true,
		exposeIcons: true,
	};

	constructor(manifest: Manifest, resources: Resources, options: Partial<Options> = {}) {
		this.manifest = manifest;
		this.resources = resources;
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
			thisCompilation.hooks.optimizeChunkAssets.tap(pluginName, (chunks) => {
				for (const entry of this.resources.entries) {
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
			});

			// Process each final chunks and get the list of files associated to each entry points
			thisCompilation.hooks.afterOptimizeChunkAssets.tap(pluginName, (chunks) => {
				const rChunks = Array.from(chunks).reverse();
				for (const chunk of rChunks) {
					const scripts = Array.from(chunk.files).filter((file) => file.endsWith(".js"));
					const styles = Array.from(chunk.files)
						.filter((file) => file.endsWith(".css"))
						.concat(Array.from(chunk.auxiliaryFiles).filter((file) => file.endsWith(".css")));
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
						let entry = this.resources.entries.find((entry) => entry.name == runtime);
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

					// TODO options.exposeIcons
					// TODO Expose auxiliaryFiles that are *not* scripts and styles and add them to web_accessible_resources
					// TODO -- along with emitting them as assets ?

					// TODO auxiliaryFiles as assets
					// * chunk.auxiliaryFiles
				}
			});

			// * Add the final manifest.json to the output
			thisCompilation.hooks.afterSeal.tap(pluginName, () => {
				// * Add the final manifest.json to the output
				const manifestStr = JSON.stringify(this.manifest);
				thisCompilation.emitAsset("manifest.json", new RawSource(manifestStr));
			});
		});
	}
}
