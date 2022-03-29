import fs from "fs";
import { join } from "path";

// Transform manifest.json and include it in the bundle
// Fixed and simplified from webpack-webextension-plugin
// @see https://github.com/webextension-toolbox/webpack-webextension-plugin
export default class ManifestPlugin {
	constructor({ manifest, version, vendor, meta, subManifests }) {
		this.manifestPath = manifest;
		this.version = version;
		this.vendor = vendor;
		this.meta = meta;
		this.subManifests = subManifests;
		this.vendors = /^(firefox|chrome|edge):(.+)/;
	}

	apply(compiler) {
		const { name } = this.constructor;
		this.sources = compiler.webpack.sources;
		compiler.hooks.make.tapPromise(name, this.make.bind(this));
		compiler.hooks.afterCompile.tap(name, this.afterCompile.bind(this));
	}

	async make(compilation) {
		// Load manifest
		const manifestPath = join(compilation.options.context, this.manifestPath);
		const manifestBuffer = fs.readFileSync(manifestPath);

		// Convert to JSON
		let manifest;
		try {
			manifest = JSON.parse(manifestBuffer);
		} catch (error) {
			throw new Error("Could not parse manifest.json");
		}
		manifest = this.buildManifest(manifest);

		// Create webpack file entry
		const manifestStr = JSON.stringify(manifest);
		compilation.emitAsset("manifest.json", new this.sources.RawSource(manifestStr));
	}

	afterCompile(compilation) {
		compilation.fileDependencies.add(join(compilation.options.context, this.manifestPath));
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
					return withVendor ? withVendor[1] == this.vendor : true;
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
					return value.replace(`${this.vendor}:`, "");
				}
				return value;
			});
	}

	/**
	 * Check each keys in the object for vendor prefix and remove them or remove the prefix.
	 * @param {object} object
	 */
	buildObject(object) {
		// Work on copies
		object = JSON.parse(JSON.stringify(object));

		for (const key in object) {
			let useKey = key;

			const withVendor = key.match(this.vendors);
			if (withVendor) {
				const forVendor = withVendor[1];
				if (forVendor != this.vendor) {
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

	buildManifest(manifest) {
		// Check each keys in the manifest for the `vendor:` prefix
		manifest = this.buildObject(manifest);
		manifest.version = this.version;

		// Merge subManifests
		// Only a few selected keys are allowed:
		// -- `host_permissions` which are just pushed to the existing ones
		// -- `content_scripts` objects which are also pushed to the existing ones
		if (this.subManifests) {
			for (const subManifest of this.subManifests) {
				const content = subManifest.content;
				if (content.host_permissions) {
					if (!manifest.host_permissions) {
						manifest.host_permissions = [];
					}
					manifest.host_permissions.push(...content.host_permissions);
				}
				if (content.content_scripts) {
					if (!manifest.content_scripts) {
						manifest.content_scripts = [];
					}
					manifest.content_scripts.push(content.content_scripts);
				}
			}
		}

		// Additional meta that is directly added to the manifest
		if (this.meta) {
			for (const key in this.meta) {
				if (!(key in manifest)) {
					manifest[key] = this.meta[key];
				}
			}
		}

		// Remove host_permissions in manifest v2
		if (manifest.manifest_version == 2 && manifest.host_permissions && Array.isArray(manifest.host_permissions)) {
			if (!manifest.permissions) {
				manifest.permissions = [];
			}
			if (Array.isArray(manifest.permissions)) {
				manifest.permissions.push(...manifest.host_permissions);
				delete manifest.host_permissions;
			}
		}

		return manifest;
	}
}
