import progress from "rollup-plugin-progress";
import del from "rollup-plugin-delete";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import postcss from "rollup-plugin-postcss";
import svelte from "rollup-plugin-svelte";
import sveltePreprocessor from "svelte-preprocess";
import postCssPresetEnv from "postcss-preset-env";
import tailwindcss from "tailwindcss";
import typescript from "@rollup/plugin-typescript";
import { typescriptPaths } from "rollup-plugin-typescript-paths";
import sizes from "rollup-plugin-sizes";

const vendor = process.env.VENDOR;
const production = process.env.NODE_ENV === "production";
export default (async () => ({
	input: {
		background: "./src/Background/index.ts",
		mangadex: "./src/Site/MangaDex/index.ts",
		options: "./src/Options/index.ts",
	},
	plugins: [
		del({ targets: `./build/${vendor}/`, runOnce: !production }),
		progress(),
		nodeResolve({ browser: true }),
		commonjs({ extensions: [".js", ".ts"], sourceType: "module" }),
		svelte({
			compilerOptions: {
				dev: !production,
			},
			preprocess: sveltePreprocessor({
				postcss: true,
			}),
			emitCss: true,
		}),
		postcss({
			extract: true,
			plugins: [postCssPresetEnv(), tailwindcss("./tailwind.config.cjs")],
		}),
		typescript({
			sourceMap: !production,
			compilerOptions: {
				outDir: `./build/${vendor}/`,
			},
		}),
		typescriptPaths({ transform: true }),
		production && (await import("rollup-plugin-terser")).terser(),
		sizes(),
	],
	output: {
		dir: `./build/${vendor}/`,
		entryFileNames: "[name].js",
		format: "es",
		sourcemap: "inline",
	},
	watch: {
		buildDelay: 100,
		clearScreen: false,
		chokidar: false,
		exclude: ["node_modules/**/*", "build/**/*"],
	},
}))();
