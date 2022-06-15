import fs from 'fs';
import { dirname, resolve, join } from 'path';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

var vendors = /^(firefox|chrome|edge):(.+)/;
// Open the file and convert it to JSON
// No check on the validity is done here
function readSourceManifest(path) {
    var manifest;
    try {
        var manifestBuffer = fs.readFileSync(path);
        manifest = JSON.parse(manifestBuffer.toString());
    }
    catch (error) {
        throw new Error("Could not parse manifest.json: ".concat(error));
    }
    return manifest;
}
/**
 * Check each values in the array for vendor prefix and remove them or remove the prefix.
 * @param {array} array
 */
function buildArray(array, vendor) {
    return array
        .filter(function (value) {
        if (Array.isArray(value)) {
            return true;
        }
        else if (typeof value === "object" && value !== null) {
            if (Object.keys(value).length == 0) {
                return false;
            }
        }
        else if (typeof value === "string") {
            var withVendor = value.match(vendors);
            return withVendor ? withVendor[1] == vendor : true;
        }
        return true;
    })
        .map(function (value) {
        if (Array.isArray(value)) {
            return buildArray(value, vendor);
        }
        else if (typeof value === "object" && value !== null) {
            // Cleanup nested objects
            // -- and remove them if they are emtpy
            buildObject(value, vendor);
        }
        else if (typeof value === "string") {
            return value.replace("".concat(vendor, ":"), "");
        }
        return value;
    });
}
function buildObject(object, vendor) {
    // Work on copies
    object = JSON.parse(JSON.stringify(object));
    for (var key in object) {
        var useKey = key;
        var withVendor = key.match(vendors);
        if (withVendor) {
            var forVendor = withVendor[1];
            if (forVendor != vendor) {
                delete object[key];
                continue;
            }
            else {
                useKey = withVendor[2];
                object[useKey] = object[key];
                delete object[key];
            }
        }
        // Check nested item keys and values if needed
        if (Array.isArray(object[useKey])) {
            object[useKey] = buildArray(object[useKey], vendor);
        }
        else if (typeof object[useKey] === "object") {
            // Cleanup all nested objects
            object[useKey] = buildObject(object[useKey], vendor);
        }
    }
    return object;
}
function buildManifest(manifestPath, manifest, vendor) {
    var _a;
    try {
        // * Collect sub manifests
        // * Load all manifest.json files
        var subManifests_2 = [];
        var rootDir_1 = dirname(manifestPath);
        var collectManifests_1 = function (path) {
            var files = fs.readdirSync(path, { withFileTypes: true });
            for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
                var file = files_1[_i];
                if (file.isDirectory() && file.name !== "node_modules") {
                    collectManifests_1("".concat(path, "/").concat(file.name));
                }
                else if (file.name == "manifest.json" && path != rootDir_1) {
                    var filePath = "./".concat(path, "/").concat(file.name);
                    var subManifest = {
                        namespace: path.split("/").pop(),
                        manifestPath: filePath,
                        content: JSON.parse(fs.readFileSync(filePath).toString())
                    };
                    // If there is a script to build, it should be marked with a
                    // -- `content_scripts` key to know *where* to use the script
                    // -- and an `entry` key to the script.
                    // -- Dependencies and output will automatically be added to the `js` and `css` keys
                    if (subManifest.content.content_scripts && subManifest.content.content_scripts.entry) {
                        var scriptPath = join(path, subManifest.content.content_scripts.entry);
                        subManifest.content.content_scripts = __assign(__assign({}, subManifest.content.content_scripts), { entry: scriptPath });
                        if (!subManifest.content.content_scripts.matches) {
                            console.warn("A `content_scripts` should always have at least one element in `matches`");
                        }
                    }
                    subManifests_2.push(subManifest);
                }
            }
        };
        collectManifests_1(dirname(manifestPath));
        // * Merge them with the main manifest
        // Keys can still be prefixed with a browser vendor
        // -- so we need to match the suffix of the object key
        var mergeSubManifestContent = function (content, keySuffix) {
            var _a;
            var matchingKeys = Object.keys(content).filter(function (key) { return key.match(new RegExp(":?".concat(keySuffix, "$"))); });
            for (var _i = 0, matchingKeys_1 = matchingKeys; _i < matchingKeys_1.length; _i++) {
                var matchingKey = matchingKeys_1[_i];
                if (!manifest[matchingKey]) {
                    manifest[matchingKey] = [];
                }
                if (matchingKey == "content_scripts") {
                    manifest[matchingKey].push(content[matchingKey]);
                }
                else {
                    (_a = manifest[matchingKey]).push.apply(_a, content[matchingKey]);
                }
            }
            manifest.version = "2";
        };
        for (var _i = 0, subManifests_1 = subManifests_2; _i < subManifests_1.length; _i++) {
            var subManifest = subManifests_1[_i];
            mergeSubManifestContent(subManifest.content, "host_permissions");
            mergeSubManifestContent(subManifest.content, "content_scripts");
            mergeSubManifestContent(subManifest.content, "web_accessible_resources");
        }
        // * Remove `vendor:` prefix
        // Check each keys in the manifest for the `vendor:` prefix
        manifest = buildObject(manifest, vendor);
        // * Update the `version` key to use the package.json version
        var version = process.env.npm_package_version;
        if (version) {
            manifest.version = version;
        }
        else {
            manifest.version = "0";
        }
        // * Remove host_permissions in manifest v2
        // They are merged to the `permissions` key with the other API permissions
        if (manifest.manifest_version == 2 && manifest.host_permissions && Array.isArray(manifest.host_permissions)) {
            if (!manifest.permissions) {
                manifest.permissions = [];
            }
            if (Array.isArray(manifest.permissions)) {
                (_a = manifest.permissions).push.apply(_a, manifest.host_permissions);
                delete manifest.host_permissions;
            }
        }
    }
    catch (error) {
        console.error(error);
    }
    return manifest;
}
function readAndTransformManifest(manifestPath, vendor) {
    var manifest = readSourceManifest(manifestPath);
    return buildManifest(manifestPath, manifest, vendor);
}
function getResources(manifest) {
    var resources = { entries: [], assets: [] };
    try {
        // TODO add html entry points (browser_action.default_popup)
        // * Content scripts
        if (manifest.content_scripts &&
            Array.isArray(manifest.content_scripts) &&
            manifest.content_scripts.length > 0) {
            for (var _i = 0, _a = manifest.content_scripts; _i < _a.length; _i++) {
                var script = _a[_i];
                if (script.entry) {
                    resources.entries.push({
                        name: dirname(script.entry).split("/").pop(),
                        script: script.entry,
                        reference: script
                    });
                    delete script.entry;
                }
            }
        }
        // * Background scripts
        if (manifest.background) {
            if ("scripts" in manifest.background && manifest.background.scripts) {
                for (var _b = 0, _c = manifest.background.scripts; _b < _c.length; _b++) {
                    var script = _c[_b];
                    var path_1 = resolve(script);
                    resources.entries.push({
                        name: dirname(script).split("/").pop(),
                        script: script,
                        reference: manifest.background,
                        key: "scripts"
                    });
                }
                manifest.background.scripts = [];
            }
            else if ("service_worker" in manifest.background && manifest.background.service_worker) {
                resources.entries.push({
                    name: "background",
                    script: resolve(manifest.background.service_worker),
                    reference: manifest.background,
                    key: "service_worker"
                });
                manifest.background.service_worker = "";
            }
        }
    }
    catch (error) {
        console.error(error);
    }
    // * Add `web_accessible_resources` as assets
    // * Add `browser_action.default_icon` as assets
    // * Add `icons` as assets
    return resources;
}

export { getResources, readAndTransformManifest };
