import { resolve as resolvePath } from "path";
import webpack from "webpack";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import CaseSensitivePathsPlugin from "case-sensitive-paths-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import ZipPlugin from "zip-webpack-plugin";
import preprocess from "svelte-preprocess";
import { getBrowserAction, getEntries, readAndTransformManifest } from "./config/ManifestTransformer.js";
import WebExtensionPlugin from "./config/WebExtensionPlugin.js";
import HtmlWebpackPlugin from "html-webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import ImageMinimizerPlugin from "image-minimizer-webpack-plugin";
import TerserPlugin from "terser-webpack-plugin";
import WebpackStringReplacer from "webpack-string-replacer";

export default (env, argv) => {
	const vendor = env.vendor;
	if (!vendor) throw new Error("Missing `vendor`.");
	const version = process.env.npm_package_version;
	const name = process.env.npm_package_name;
	const production = argv.mode === "production";

	// Transform manifest
	const manifestPath = "src/manifest.json";
	const manifest = readAndTransformManifest(manifestPath, vendor);

	// Collect entrypoints
	const entries = getEntries(manifest);
	const entry = {};
	for (const entrypoint of entries) {
		if (!entrypoint.script.endsWith(".js")) {
			entry[entrypoint.name] = entrypoint.script;
		}
	}
	const browserAction = getBrowserAction(manifest);
	if (browserAction.entry) {
		entry.options = browserAction.entry;
	}

	return {
		entry,
		optimization: {
			splitChunks: {
				chunks: "all",
			},
			minimize: true,
			minimizer: [
				production
					? new TerserPlugin({
							minify: TerserPlugin.esbuildMinify,
					  })
					: { apply: () => {} },
				new CssMinimizerPlugin(),
				new ImageMinimizerPlugin({
					minimizer: {
						implementation: ImageMinimizerPlugin.imageminMinify,
						options: {
							plugins: [
								[
									"svgo",
									{
										name: "preset-default",
										params: {
											overrides: {
												addAttributesToSVGElement: {
													attributes: [{ xmlns: "http://www.w3.org/2000/svg" }],
												},
												removeViewBox: false,
											},
										},
									},
								],
							],
						},
					},
				}),
			],
		},
		devtool: production ? undefined : "inline-source-map",
		module: {
			rules: [
				{
					test: /\.js$/,
					type: "asset/resource",
					exclude: /node_modules/,
				},
				{
					test: /\.svelte$/,
					use: {
						loader: "svelte-loader",
						options: {
							compilerOptions: {
								dev: !production,
							},
							emitCss: true,
							preprocess: preprocess({
								postcss: true,
							}),
						},
					},
				},
				{
					test: /\.ts$/,
					loader: "ts-loader",
					exclude: /node_modules/,
				},
				{
					test: /\.p?css$/,
					use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
				},
			],
		},
		resolve: {
			plugins: [new TsconfigPathsPlugin()],
			extensions: [".ts"],
		},
		output: {
			clean: true,
			path: resolvePath(process.cwd(), `build/${env.vendor}`),
			filename: (pathData) => {
				return entry[pathData.chunk.name] ? "[name].js" : "[id].js";
			},
			assetModuleFilename: "[name][ext]",
		},
		plugins: [
			new MiniCssExtractPlugin({
				filename: (pathData) => {
					return entry[pathData.chunk.name] ? "[name].css" : "[id].css";
				},
			}),
			new CaseSensitivePathsPlugin(),
			new webpack.DefinePlugin({
				"process.env.VENDOR": JSON.stringify(vendor),
				"url(light-icon":
					vendor == "firefox"
						? "url(moz-extension://__MSG_@@extension_id__/light-icon"
						: "url(chrome-extension://__MSG_@@extension_id__/light-icon",
			}),
			new WebpackStringReplacer({
				rules: [
					{
						applyStage: "optimizeChunkAssets",
						outputFileInclude: /\.css$/,
						replacements: [
							{
								pattern: "url(light-icon",
								replacement:
									vendor == "firefox"
										? "url(moz-extension://__MSG_@@extension_id__/light-icon"
										: "url(chrome-extension://__MSG_@@extension_id__/light-icon",
							},
						],
					},
				],
			}),
			new CopyWebpackPlugin({
				patterns: [{ from: "static", to: "static" }],
			}),
			browserAction.entry
				? new HtmlWebpackPlugin({
						template: browserAction.template,
						filename: "options.html",
						excludeChunks: entries.filter((entry) => entry.name != "options").map((entry) => entry.name),
						inject: "body",
				  })
				: { apply: () => {} },
			new WebExtensionPlugin(manifest, entries, {
				production,
				vendor,
				expose: ["static/icons/*.png", "static/sleepy_64.png", "static/loading_64.png"],
			}),
			production
				? new ZipPlugin({
						path: resolvePath(process.cwd(), "web-ext-artifacts"),
						filename: `${name}_${version}_${vendor}.zip`,
				  })
				: { apply: () => {} },
		],
	};
};
