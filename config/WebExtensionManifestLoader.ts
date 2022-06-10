import fs from "fs";
import path from "path";
import type { Schema } from "schema-utils/declarations/validate";
import type { Source } from "webpack-sources";
import { validate } from "schema-utils";
import type { LoaderContext } from "webpack";

export type Manifest = {
	manifest_version: 2 | 3;
	author: string;
	description?: string;
	permissions?: string[];
	host_permissions?: string[];
	icons?: { [key: string]: string };
	browser_action?: {
		browser_style: boolean;
		default_title?: string;
		default_popup?: string;
		default_icon?: { [key: string]: string };
	};
	content_scripts?: string[];
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

type Options = {
	usePackageVersion?: boolean;
	loadSubManifests?: boolean;
	exposeIcons?: boolean;
	vendor: string;
};
const schema: Schema = {
	type: "object",
	properties: {
		usePackageVersion: {
			type: "boolean",
			default: true,
		},
		loadSubManifests: {
			type: "boolean",
			default: true,
		},
		exposeIcons: {
			type: "boolean",
			default: true,
		},
		vendor: {
			type: "string",
		},
	},
};

const vendors = /^(firefox|chrome|edge):(.+)/;

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

export default function (this: LoaderContext<Options>, source: Source) {
	const options = this.getOptions();
	validate(schema, options, {
		name: "WebExtension Manifest Loader",
		baseDataPath: "options",
	});

	if (this.cacheable) {
		this.cacheable();
	}

	// * Convert to JSON
	// No check on the validity is done here
	let manifest: Manifest;
	if (typeof source === "string") {
		try {
			manifest = JSON.parse(source);
		} catch (error) {
			// ? Emit error
			throw new Error("Could not parse manifest.json");
		}
	} else {
		manifest = (<unknown>source) as Manifest;
	}

	// * Collect sub manifests
	if (options.loadSubManifests) {
		// * Load all manifest.json files
		let subManifests: {
			namespace: string;
			path: string;
			content: any;
		}[] = [];
		const collectManifests = (currenPath: string) => {
			const files = fs.readdirSync(currenPath, { withFileTypes: true });
			for (const file of files) {
				if (file.isDirectory() && file.name !== "node_modules") {
					collectManifests(`${currenPath}/${file.name}`);
				} else if (file.name == "manifest.json" && currenPath != "./src") {
					const filePath = `${currenPath}/${file.name}`;
					// Make sure to add the sub manifest as a dependency for watch mode
					this.addDependency(filePath);
					const subManifest = {
						namespace: currenPath.split("/").pop()!,
						path: filePath,
						content: JSON.parse(fs.readFileSync(filePath).toString()),
					};
					subManifests.push(subManifest);
					// If there is a script to build, it should be marked with a
					// -- `content_scripts` key to know *where* to use the script
					// -- and an `entry` key to the script.
					// -- Dependencies and output will automatically be added to the `js` and `css` keys
					if (subManifest.content.content_scripts && subManifest.content.content_scripts.entry) {
						const scriptPath = path.resolve(`${currenPath}/${subManifest.content.content_scripts.entry}`);
						subManifest.content.content_scripts = {
							entry: scriptPath,
							...subManifest.content.content_scripts,
						};
						if (!subManifest.content.content_scripts.matches) {
							// ? Emit warning
							console.warn("A `content_scripts` should always have at least one element in `matches`");
						}
					}
				}
			}
		};
		collectManifests(path.dirname(this.resourcePath));

		// * Merge them with the main manifest
		// Keys can still be prefixed with a browser vendor
		// -- so we need to match the suffix of the object key
		let mergeSubManifestContent = (content: { [key: string]: Array<any> }, keySuffix: string) => {
			const matchingKeys = Object.keys(content).filter((key) => key.match(`/:?${keySuffix}$/`));
			for (const matchingKey of matchingKeys) {
				if (!manifest[matchingKey]) {
					manifest[matchingKey] = [];
				}
				(manifest[matchingKey] as Array<any>).push(...content[matchingKey]);
			}
		};
		for (const subManifest of subManifests) {
			mergeSubManifestContent(subManifest.content, "host_permissions");
			mergeSubManifestContent(subManifest.content, "content_scripts");
			mergeSubManifestContent(subManifest.content, "web_accessible_resources");
		}
	}

	// * Remove `vendor:` prefix
	// Check each keys in the manifest for the `vendor:` prefix
	manifest = buildObject(manifest, options.vendor) as Manifest;

	// * Expose `icons` and `browser_action.default_icon`
	if (options.exposeIcons) {
		// TODO
	}

	// * Update the `version` key to use the package.json version
	if (options.usePackageVersion) {
		const version = process.env.npm_package_version;
		if (version) {
			manifest.version = version;
		} else {
			// ? Emit warning ?
		}
	}

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

	// * Emit the transformed manifest
	this.emitFile("manifest.json", JSON.stringify(manifest));
	const outputPath: string = "manifest.json";

	// * Empty Javascript module as an output
	return `module.exports = ${`__webpack_public_path__ + ${JSON.stringify(outputPath)}`};`;
}
