module.exports = {
	mode: "jit",
	important: "#tkma",
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: "class",
	theme: {
		extend: {
			colors: {
				tachikoma: {
					50: "#EFF1F6",
					100: "#CFD4E3",
					200: "#AEB7D0",
					300: "#8E9ABD",
					400: "#6E7DAB",
					500: "#5B6C9D",
					600: "#424E71",
					700: "#2F3851",
					800: "#1C2130",
					900: "#090B10",
				},
				// gray: "#D7DEDC",
				black: "#131515",
			},
		},
	},
	variants: {
		extend: {},
	},
	plugins: [],
};
