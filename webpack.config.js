import { resolve } from "path";
import webpack from "webpack";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import CaseSensitivePathsPlugin from "case-sensitive-paths-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import ZipPlugin from "zip-webpack-plugin";
import { default as ManifestPlugin } from "./src/Build/ManifestPlugin.js";

export default (env, argv) => {
	const vendor = env.vendor;
	if (!vendor) throw new Error("Missing `vendor`.");
	const version = process.env.npm_package_version;
	const name = process.env.npm_package_name;

	return {
		entry: {
			background: { import: "./src/Background/index.ts" },
			mangadex: { import: "./src/Site/MangaDex/index.ts" },
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
					use: "ts-loader",
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
				new ManifestPlugin({ meta: { name }, manifest: "./src/manifest.json", version, vendor }),
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
