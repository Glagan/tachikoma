import peerDepsExternal from "rollup-plugin-peer-deps-external";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import replace from "@rollup/plugin-replace";
import { terser } from "rollup-plugin-terser";

// this override is needed because Module format cjs does not support top-level await
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require("./package.json");

const globals = {
	...packageJson.devDependencies,
};

const isProduction = !!process.env.production;

export default {
	input: "src/Background/service_worker.ts",
	output: [
		{
			file: "build/chrome/service_worker.js",
			format: "esm", // ES Modules
			sourcemap: "inline",
		},
	],
	plugins: [
		peerDepsExternal(),
		resolve(),
		commonjs(),
		typescript({
			useTsconfigDeclarationDir: true,
			tsconfigOverride: {
				exclude: ["**/*.stories.*"],
			},
		}),
		replace({
			preventAssignment: true,
			"process.env.VENDOR": JSON.stringify("chrome"),
		}),
		commonjs({
			exclude: "node_modules",
			ignoreGlobal: true,
		}),
		isProduction && terser(),
	],
	external: Object.keys(globals),
};
