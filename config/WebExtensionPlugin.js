/// @ts-check

import fs from "fs";
import { resolve, dirname, join } from "path";

// Transform manifest.json and include it in the bundle
export default class WebExtensionPlugin {
	static defaultOptions = {
		usePackageVersion: true,
		loadSubManifests: true,
		exposeIcons: true,
	};

	constructor(options = {}) {
		this.options = { ...WebExtensionPlugin.defaultOptions, ...options };
		this.virtualModules = options.virtualModules;
		this.vendors = /^(firefox|chrome|edge):(.+)/;
	}

	/**
	 * Check each values in the array for vendor prefix and remove them or remove the prefix.
	 * @param {array} array
	 */
	buildArray(array) {
		return array
			.filter((value) => {
				if (Array.isArray(value)) {
					return true;
				} else if (typeof value === "object" && value !== null) {
					if (Object.keys(value).length == 0) {
						return false;
					}
				} else if (typeof value === "string") {
					const withVendor = value.match(this.vendors);
					return withVendor ? withVendor[1] == this.options.vendor : true;
				}
				return true;
			})
			.map((value) => {
				if (Array.isArray(value)) {
					return this.buildArray(value);
				} else if (typeof value === "object" && value !== null) {
					// Cleanup nested objects
					// -- and remove them if they are emtpy
					this.buildObject(value);
				} else if (typeof value === "string") {
					return value.replace(`${this.options.vendor}:`, "");
				}
				return value;
			});
	}

	buildObject(object) {
		// Work on copies
		object = JSON.parse(JSON.stringify(object));

		for (const key in object) {
			let useKey = key;

			const withVendor = key.match(this.vendors);
			if (withVendor) {
				const forVendor = withVendor[1];
				if (forVendor != this.options.vendor) {
					delete object[key];
					continue;
				} else {
					useKey = withVendor[2];
					object[useKey] = object[key];
					delete object[key];
				}
			}

			// Check nested item keys and values if needed
			if (Array.isArray(object[useKey])) {
				object[useKey] = this.buildArray(object[useKey]);
			} else if (typeof object[useKey] === "object") {
				// Cleanup all nested objects
				object[useKey] = this.buildObject(object[useKey]);
			}
		}

		return object;
	}

	buildManifest(compilation, manifestPath, mainManifest) {
		let manifest = JSON.parse(JSON.stringify(mainManifest));

		try {
			// * Collect sub manifests
			if (this.options.loadSubManifests) {
				// * Load all manifest.json files
				let subManifests = [];
				const rootDir = dirname(manifestPath);
				const collectManifests = (path) => {
					const files = fs.readdirSync(path, { withFileTypes: true });
					for (const file of files) {
						if (file.isDirectory() && file.name !== "node_modules") {
							collectManifests(`${path}/${file.name}`);
						} else if (file.name == "manifest.json" && path != rootDir) {
							const filePath = resolve(`${path}/${file.name}`);
							// ? Make sure to add the sub manifest as a dependency for watch mode
							if (compilation.fileDependencies?.add) {
								compilation.fileDependencies.add(filePath);
							}
							const subManifest = {
								namespace: path.split("/").pop(),
								manifestPath: filePath,
								content: JSON.parse(fs.readFileSync(filePath).toString()),
							};
							// If there is a script to build, it should be marked with a
							// -- `content_scripts` key to know *where* to use the script
							// -- and an `entry` key to the script.
							// -- Dependencies and output will automatically be added to the `js` and `css` keys
							if (subManifest.content.content_scripts && subManifest.content.content_scripts.entry) {
								const scriptPath = resolve(join(path, subManifest.content.content_scripts.entry));
								subManifest.content.content_scripts = {
									...subManifest.content.content_scripts,
									entry: scriptPath,
								};
								if (!subManifest.content.content_scripts.matches) {
									// ? Emit warning
									console.warn(
										"A `content_scripts` should always have at least one element in `matches`"
									);
								}
							}
							subManifests.push(subManifest);
						}
					}
				};
				collectManifests(dirname(manifestPath));

				// * Merge them with the main manifest
				// Keys can still be prefixed with a browser vendor
				// -- so we need to match the suffix of the object key
				let mergeSubManifestContent = (content, keySuffix) => {
					const matchingKeys = Object.keys(content).filter((key) => key.match(new RegExp(`:?${keySuffix}$`)));
					for (const matchingKey of matchingKeys) {
						if (!manifest[matchingKey]) {
							manifest[matchingKey] = [];
						}
						if (matchingKey == "content_scripts") {
							manifest[matchingKey].push(content[matchingKey]);
						} else {
							manifest[matchingKey].push(...content[matchingKey]);
						}
					}
					manifest.version = "2";
				};
				for (const subManifest of subManifests) {
					mergeSubManifestContent(subManifest.content, "host_permissions");
					mergeSubManifestContent(subManifest.content, "content_scripts");
					mergeSubManifestContent(subManifest.content, "web_accessible_resources");
				}
			}

			// * Remove `vendor:` prefix
			// Check each keys in the manifest for the `vendor:` prefix
			manifest = this.buildObject(manifest);

			// * Update the `version` key to use the package.json version
			if (this.options.usePackageVersion) {
				const version = process.env.npm_package_version;
				if (version) {
					manifest.version = version;
				} else {
					// ? Emit warning ?
				}
			}

			// * Remove host_permissions in manifest v2
			// They are merged to the `permissions` key with the other API permissions
			if (
				manifest.manifest_version == 2 &&
				manifest.host_permissions &&
				Array.isArray(manifest.host_permissions)
			) {
				if (!manifest.permissions) {
					manifest.permissions = [];
				}
				if (Array.isArray(manifest.permissions)) {
					manifest.permissions.push(...manifest.host_permissions);
					delete manifest.host_permissions;
				}
			}
		} catch (error) {
			console.error(error);
		}

		return manifest;
	}

	getEntrypoints(manifest) {
		let entrypoints = [];
		try {
			// TODO add html entry points (browser_action.default_popup)
			// * Content scripts
			if (
				manifest.content_scripts &&
				Array.isArray(manifest.content_scripts) &&
				manifest.content_scripts.length > 0
			) {
				for (let script of manifest.content_scripts) {
					if (script.entry) {
						entrypoints.push({
							name: `content_${script.entry}`,
							entry: resolve(script.entry),
							reference: script,
						});
						delete script.entry;
					}
				}
			}
			// * Background scripts
			if (manifest.background) {
				if (manifest.background.scripts) {
					for (const script of manifest.background.scripts) {
						entrypoints.push({
							name: `background_${script}`,
							entry: resolve(script),
							reference: manifest.background,
							key: "scripts",
						});
					}
					manifest.background.scripts = [];
				} else if (manifest.background.service_worker) {
					// ? single bundle mode
					entrypoints.push({
						name: `background_worker`,
						entry: resolve(manifest.background.service_worker),
						reference: manifest.background,
						key: "service_worker",
					});
					manifest.background.service_worker = "";
				}
			}
		} catch (error) {
			console.error(error);
		}
		// * Add `web_accessible_resources` as assets
		// * Add `browser_action.default_icon` as assets
		// * Add `icons` as assets
		return entrypoints;
	}

	apply(compiler) {
		const pluginName = WebExtensionPlugin.name;
		const { webpack } = compiler;
		const { RawSource } = webpack.sources;
		const { options, context } = this;

		let manifest = {};

		// console.log("webpack", Object.keys(webpack).sort());
		// console.log("compiler.resolverFactory", compiler.resolverFactory);

		compiler.hooks.thisCompilation.tap(pluginName, (thisCompilation) => {
			// * Intercept manifest.json compilations
			thisCompilation.hooks.buildModule.tap(pluginName, (compilation) => {
				// console.log("hook buildModule for", compilation);
				if (compilation.resource.match(/manifest\.json$/)) {
					// * Load manifest
					const manifestPath = compilation.resource;
					const manifestBuffer = fs.readFileSync(manifestPath);

					// * Convert to JSON
					try {
						manifest = JSON.parse(manifestBuffer);
					} catch (error) {
						throw new Error("Could not parse manifest.json");
					}

					// * Apply all options
					manifest = this.buildManifest(thisCompilation, manifestPath, manifest);

					// * Add entry points
					let entrypoints = this.getEntrypoints(manifest);
					// console.log("adding to modules", thisCompilation.modules);
					for (const entrypoint of entrypoints) {
						try {
							// compiler.doResolve({}, entrypoint.entry);
							// thisCompilation.modules.insert(entrypoint.entry);
							const dep = new Dependency();
							dep.loc = { name: entrypoint.entry };
							compilation.addEntry(context, dep, options, (...args) => {
								console.log("addEntry", args);
							});
						} catch (error) {
							console.error(error);
						}
					}
				}
			});

			// * Remove manifest.js asset
			thisCompilation.hooks.chunkAsset.tap(pluginName, (chunk, file) => {
				if (file === "manifest.js") {
					chunk.files.delete(file);
					delete thisCompilation.assets[file];
				}
			});

			// * Add the final manifest.json to the output
			thisCompilation.hooks.seal.tap(pluginName, (compilation) => {
				// * Add the final manifest.json to the output
				const manifestStr = JSON.stringify(manifest);
				thisCompilation.emitAsset("manifest.json", new RawSource(manifestStr));
			});
		});

		// compiler.hooks.emit.tap(pluginName, (compilation) => {
		// 	// * Add the final manifest.json to the output
		// 	const manifestStr = JSON.stringify(manifest);
		// 	compilation.emitAsset("manifest.json", new RawSource(manifestStr));
		// });

		// Tapping to the "thisCompilation" hook in order to further tap
		// to the compilation process on an earlier stage.
		/*compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
			// Tapping to the assets processing pipeline on a specific stage.
			compilation.hooks.processAssets.tapAsync(
				{
					name: pluginName,

					// Using one of the later asset processing stages to ensure
					// that all assets were already added to the compilation by other plugins.
					stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
				},
				(assets) => {
					console.log("assets", assets);
					// console.log(assets["manifest.js"]._children);
					// console.log(assets["manifest.js"]._source._children[1]._children);
					// console.log(assets["manifest.js"]._children[0]._value.toString());

					// "assets" is an object that contains all assets
					// in the compilation, the keys of the object are pathnames of the assets
					// and the values are file sources.

					// Iterating over all the assets and
					// generating content for our Markdown file.
					const content =
						"# In this build:\n\n" +
						Object.keys(assets)
							.map((filename) => `- ${filename}`)
							.join("\n");

					// Adding new asset to the compilation, so it would be automatically
					// generated by the webpack in the output directory.
					compilation.emitAsset(this.options.outputFile, new RawSource(content));
				}
			);
		});*/
	}
}
