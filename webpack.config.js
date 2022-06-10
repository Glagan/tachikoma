import { resolve } from "path";
import webpack from "webpack";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import CaseSensitivePathsPlugin from "case-sensitive-paths-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import ZipPlugin from "zip-webpack-plugin";
import { ESBuildMinifyPlugin } from "esbuild-loader";
import preprocess from "svelte-preprocess";
import { default as WebExtensionPlugin } from "./config/WebExtensionPlugin.js";

export default (env, argv) => {
	const vendor = env.vendor;
	if (!vendor) throw new Error("Missing `vendor`.");
	const version = process.env.npm_package_version;
	const name = process.env.npm_package_name;
	const production = argv.mode === "production";

	return {
		entry: { manifest: "./src/manifest.json" },
		optimization: {
			splitChunks: {
				// minSize: 0,
				// cacheGroups: {
				// 	"webextension-polyfill": {
				// 		test: /[\\/]node_modules[\\/](webextension-polyfill)[\\/]/,
				// 		name: "webextension-polyfill",
				// 		chunks: "all",
				// 	},
				// 	svelte: {
				// 		test: /[\\/]node_modules[\\/](svelte)[\\/]/,
				// 		name: "svelte",
				// 		chunks: "all",
				// 	},
				// 	"light-icons": {
				// 		test: /[\\/]node_modules[\\/](light-icons)[\\/]/,
				// 		name: "light_icons",
				// 		chunks: "all",
				// 	},
				// },
				chunks: "all",
			},
			minimizer: [
				new ESBuildMinifyPlugin({
					target: "es2017",
				}),
			],
		},
		devtool: production ? undefined : "inline-source-map",
		module: {
			rules: [
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
				/*{
					// type: "javascript/auto",
					test: /manifest\.json$/,
					use: [
						{
							loader: resolve("./config/ManifestLoader.js"),
							options: {
								usePackageVersion: true,
								loadSubManifests: true,
								vendor,
							},
						},
					],
					exclude: "/node_modules",
				},*/
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
					patterns: [
						{ from: "./src/Options/index.html", to: "./options.html" },
						{ from: "./static/", to: "." },
					],
				}),
				new webpack.DefinePlugin({
					"process.env.VENDOR": JSON.stringify(vendor),
				}),
				new WebExtensionPlugin({ vendor }),
			];
			if (production) {
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
