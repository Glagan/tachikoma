const postCssPresetEnv = require("postcss-preset-env");
const tailwindcss = require("tailwindcss");

module.exports = {
	plugins: [postCssPresetEnv(), tailwindcss("./tailwind.config.cjs")],
};
