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
			thisCompilation.hooks.afterOptimizeChunkAssets.tap(pluginName, (chunks) => {
				// Process each final chunks and get the list of files associated to each entry points
				const rChunks = Array.from(chunks).reverse();
				for (const chunk of rChunks) {
					const scripts = Array.from(chunk.files).filter((file) => file.endsWith(".js"));
					let entry = this.resources.entries.find((entry) => entry.name == chunk.name);
					if (entry) {
						// ? A reference without a key is a content_script
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
							const styles = Array.from(chunk.files)
								.filter((file) => file.endsWith(".css"))
								.concat(Array.from(chunk.auxiliaryFiles).filter((file) => file.endsWith(".css")));
							if (styles.length > 0) {
								if (!reference[key].css) {
									reference[key].css = [];
								}
								reference[key].css.push(...styles);
							}
						}
					} else {
						// Add chunk without name to all runtimes that include it
						let runtimes = chunk.runtime;
						if (!runtimes) continue;
						if (typeof runtimes === "string") {
							runtimes = [runtimes] as any;
						}
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
								const styles = Array.from(chunk.files)
									.filter((file) => file.endsWith(".css"))
									.concat(Array.from(chunk.auxiliaryFiles).filter((file) => file.endsWith(".css")));
								if (styles.length > 0) {
									if (!reference[key].css) {
										reference[key].css = [];
									}
									reference[key].css.push(...styles);
								}
							}
						}
					}

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
