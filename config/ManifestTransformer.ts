import { readdirSync, readFileSync } from "fs";
import { dirname, join, resolve } from "path";

/**
 * The ManifestTransformer module take a manifest path and transform it
 * to include sub manifests, with merged keys, and replace keys according
 * to the prefixes to build for a vendor.
 * Content scripts, browser action and background scripts have their script url
 * replace with relative paths to be later replaced by their bundles.
 * Entrypoints and resources are collected to be sent to Webpack.
 */

export type Action = {
	entry?: string;
	template?: string;
	browser_style: boolean;
	default_title?: string;
	default_popup?: string;
	default_icon?: { [key: string]: string };
};

export type Manifest = {
	manifest_version: 2 | 3;
	name: string;
	author: string;
	description?: string;
	permissions?: string[];
	host_permissions?: string[];
	icons?: { [key: string]: string };
	action?: Action;
	browser_action?: Action;
	content_scripts?: {
		entry?: string;
		js?: string[];
		css?: string[];
		matches: string[];
	}[];
} & (
	| {
			manifest_version: 2;
			background: {
				scripts: string[];
			};
			web_accessible_resources?: string[];
	  }
	| {
			manifest_version: 3;
			background: {
				service_worker: string;
			};
			web_accessible_resources?: { resources: string[]; matches: string[] }[];
	  }
) & { [key: string]: string | number | object | Array<any> };

export type SubManifest = {
	namespace: string;
	manifestPath: string;
	content: any;
};

const vendors = /^(firefox|chrome|edge):(.+)/;

// Open the file and convert it to JSON
// No check on the validity is done here
function readSourceManifest(path: string): Manifest {
	let manifest: Manifest;
	try {
		const manifestBuffer = readFileSync(path);
		manifest = JSON.parse(manifestBuffer.toString()) as Manifest;
	} catch (error) {
		throw new Error(`Could not parse manifest.json: ${error}`);
	}
	return manifest;
}

/**
 * Check each values in the array for vendor prefix and remove them or remove the prefix.
 * @param {array} array
 */
function buildArray(array: Array<any>, vendor: string): Array<any> {
	return array
		.filter((value) => {
			if (Array.isArray(value)) {
				return true;
			} else if (typeof value === "object" && value !== null) {
				if (Object.keys(value).length == 0) {
					return false;
				}
			} else if (typeof value === "string") {
				const withVendor = value.match(vendors);
				return withVendor ? withVendor[1] == vendor : true;
			}
			return true;
		})
		.map((value) => {
			if (Array.isArray(value)) {
				return buildArray(value, vendor);
			} else if (typeof value === "object" && value !== null) {
				// Cleanup nested objects
				// -- and remove them if they are emtpy
				buildObject(value, vendor);
			} else if (typeof value === "string") {
				return value.replace(`${vendor}:`, "");
			}
			return value;
		});
}

function buildObject(object: { [key: string]: any }, vendor: string) {
	// Work on copies
	object = JSON.parse(JSON.stringify(object));

	for (const key in object) {
		let useKey = key;

		const withVendor = key.match(vendors);
		if (withVendor) {
			const forVendor = withVendor[1];
			if (forVendor != vendor) {
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
			object[useKey] = buildArray(object[useKey], vendor);
		} else if (typeof object[useKey] === "object") {
			// Cleanup all nested objects
			object[useKey] = buildObject(object[useKey], vendor);
		}
	}

	return object;
}

function buildManifest(manifestPath: string, manifest: Manifest, vendor: string) {
	try {
		// * Collect sub manifests
		// * Load all manifest.json files
		let subManifests: SubManifest[] = [];
		const rootDir = dirname(manifestPath);
		const collectManifests = (path) => {
			const files = readdirSync(path, { withFileTypes: true });
			for (const file of files) {
				if (file.isDirectory() && file.name !== "node_modules") {
					collectManifests(`${path}/${file.name}`);
				} else if (file.name == "manifest.json" && path != rootDir) {
					const filePath = `./${path}/${file.name}`;
					const subManifest = {
						namespace: path.split("/").pop(),
						manifestPath: filePath,
						content: JSON.parse(readFileSync(filePath).toString()),
					};
					// If there is a script to build, it should be marked with a
					// -- `content_scripts` key to know *where* to use the script
					// -- and an `entry` key to the script.
					// -- Dependencies and output will automatically be added to the `js` and `css` keys
					if (subManifest.content.content_scripts && subManifest.content.content_scripts.entry) {
						const scriptPath = join(path, subManifest.content.content_scripts.entry);
						subManifest.content.content_scripts = {
							...subManifest.content.content_scripts,
							entry: scriptPath,
						};
						if (!subManifest.content.content_scripts.matches) {
							console.warn("A `content_scripts` should always have at least one element in `matches`");
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
		let mergeSubManifestContent = (content, keySuffix: string) => {
			const matchingKeys = Object.keys(content).filter((key) => key.match(new RegExp(`:?${keySuffix}$`)));
			for (const matchingKey of matchingKeys) {
				if (!manifest[matchingKey]) {
					manifest[matchingKey] = [];
				}
				if (matchingKey == "content_scripts") {
					manifest[matchingKey]!.push(content[matchingKey]);
				} else {
					(manifest[matchingKey] as Array<string>).push(...content[matchingKey]);
				}
			}
		};
		for (const subManifest of subManifests) {
			mergeSubManifestContent(subManifest.content, "host_permissions");
			mergeSubManifestContent(subManifest.content, "content_scripts");
			mergeSubManifestContent(subManifest.content, "web_accessible_resources");
		}

		// * Remove `vendor:` prefix
		// Check each keys in the manifest for the `vendor:` prefix
		manifest = buildObject(manifest, vendor) as Manifest;

		// * Remove host_permissions in manifest v2
		// They are merged to the `permissions` key with the other API permissions
		if (manifest.manifest_version == 2 && manifest.host_permissions && Array.isArray(manifest.host_permissions)) {
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

export function readAndTransformManifest(manifestPath: string, vendor: string) {
	const manifest = readSourceManifest(manifestPath);
	return buildManifest(manifestPath, manifest, vendor);
}

export type Entry = {
	name?: string;
	script: string;
	path: string;
	mode: "content_object" | "script_list" | "script";
};

export function getEntries(manifest: Manifest) {
	let entries: Entry[] = [];
	try {
		// * Content scripts
		if (
			manifest.content_scripts &&
			Array.isArray(manifest.content_scripts) &&
			manifest.content_scripts.length > 0
		) {
			let index = 0;
			for (let script of manifest.content_scripts) {
				if (script.entry) {
					// Path points to an Array of objects
					entries.push({
						name: dirname(script.entry)
							.split("/")
							.pop()!
							.toLocaleLowerCase()
							.replaceAll("\\", "_")
							.replace("src_", ""),
						script: script.entry,
						path: `content_scripts.${index}`,
						mode: "content_object",
					});
					delete script.entry;
				}
				index += 1;
			}
		}
		// * Background scripts
		if (manifest.background) {
			if ("scripts" in manifest.background && manifest.background.scripts) {
				for (const script of manifest.background.scripts) {
					// Path points to an Array of strings
					entries.push({
						name: dirname(script).split("/").pop()!.toLocaleLowerCase(),
						script: script,
						path: `background.scripts`,
						mode: "script_list",
					});
				}
				manifest.background.scripts = [];
			} else if ("service_worker" in manifest.background && manifest.background.service_worker) {
				entries.push({
					name: "service_worker",
					script: resolve(manifest.background.service_worker),
					path: `background.service_worker`,
					mode: "script",
				});
				manifest.background.service_worker = "";
			}
		}
	} catch (error) {
		console.error(error);
	}
	return entries;
}

export function getBrowserAction(manifest: Manifest) {
	let browserAction: { entry?: string; template?: string } = {
		entry: manifest.browser_action?.entry,
		template: manifest.browser_action?.template,
	};
	if (manifest.browser_action) {
		manifest.browser_action.default_popup = "options.html";
		delete manifest.browser_action.entry;
		delete manifest.browser_action.template;
	}
	return browserAction;
}
