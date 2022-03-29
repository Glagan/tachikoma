import { readdirSync, readFileSync } from "fs";
import { resolve } from "path";
import webpack from "webpack";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import CaseSensitivePathsPlugin from "case-sensitive-paths-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import ZipPlugin from "zip-webpack-plugin";
import { default as ManifestPlugin } from "./src/Build/ManifestPlugin.js";

// Collect manifests
let subManifests = [];
let entryPoints = {};
const iterateFolder = (path) => {
	const files = readdirSync(path, { withFileTypes: true });
	for (const file of files) {
		if (file.isDirectory()) {
			iterateFolder(`${path}/${file.name}`);
		} else if (file.name == "manifest.json" && path != "./src") {
			const filePath = `${path}/${file.name}`;
			const subManifest = {
				namespace: path.split("/").pop(),
				path: filePath,
				content: JSON.parse(readFileSync(filePath)),
			};
			const scriptName = subManifest.namespace.toLocaleLowerCase();
			subManifests.push(subManifest);
			// Add to the Webpack entries if there is a script to build
			if (subManifest.content.entry) {
				entryPoints[scriptName] = { import: `${path}/${subManifest.content.entry}` };
				delete subManifest.content.entry;
			}
			// -- if there is a script to build it should have a
			// -- `content_scripts` key to know *where* to use the script
			// Add the mandatory webextension polyfill and the scripts
			if (subManifest.content.content_scripts) {
				subManifest.content.content_scripts = {
					js: ["/webextension-polyfill.js", `/${scriptName}.js`],
					...subManifest.content.content_scripts,
				};
				if (!subManifest.content.content_scripts.matches) {
					console.error("A `content_scripts` should always have at least one element in `matches`");
				}
			}
		}
	}
};
iterateFolder("./src");

export default (env, argv) => {
	const vendor = env.vendor;
	if (!vendor) throw new Error("Missing `vendor`.");
	const version = process.env.npm_package_version;
	const name = process.env.npm_package_name;

	return {
		entry: {
			background: { import: "./src/Background/index.ts" },
			...entryPoints,
		},
		optimization: {
			splitChunks: {
				minSize: 0,
				cacheGroups: {
					"webextension-polyfill": {
						test: /[\\/]node_modules[\\/](webextension-polyfill)[\\/]/,
						name: "webextension-polyfill",
						chunks: "all",
					},
				},
			},
		},
		devtool: argv.mode === "production" ? undefined : "source-map",
		module: {
			rules: [
				{
					test: /\.ts$/,
					use: "esbuild-loader",
					exclude: /node_modules/,
				},
				{
					test: /\.css$/i,
					use: [MiniCssExtractPlugin.loader, "css-loader"],
				},
			],
		},
		resolve: {
			plugins: [new TsconfigPathsPlugin()],
			extensions: [".ts"],
		},
		output: {
			clean: true,
			path: resolve(process.cwd(), `build/${env.vendor}`),
			filename: "[name].js",
		},
		plugins: (() => {
			const plugins = [
				new MiniCssExtractPlugin(),
				new CaseSensitivePathsPlugin(),
				new CopyWebpackPlugin({
					patterns: [{ from: "./static/", to: "." }],
				}),
				new webpack.DefinePlugin({
					"process.env.VENDOR": JSON.stringify(vendor),
				}),
				new ManifestPlugin({ meta: { name }, manifest: "./src/manifest.json", version, vendor, subManifests }),
			];
			if (argv.mode === "production") {
				plugins.push(
					new ZipPlugin({
						path: resolve(process.cwd(), "web-ext-artifacts"),
						filename: `${name}_${version}_${vendor}.zip`,
					})
				);
			}
			return plugins;
		})(),
	};
};
