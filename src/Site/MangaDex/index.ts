import { Options } from "@Core/Options";
import Router from "@Core/Router";
import Tachikoma from "@Core/Tachikoma";
import { injectScript } from "@Core/Utility";
import Chapter from "./Pages/Chapter";
import Title from "./Pages/Title";
import ChapterList from "./Pages/ChapterList";
import "./index.css";

const router = new Router();
// router.add(
// 	[
// 		/\/follows\/?$/,
// 		/\/follows\/chapters(\/?$|\/\d+(\/\d+\/?)?)?/,
// 		/\/group\/\d+(\/[-A-Za-z0-9_]{0,}\/?)?$/,
// 		/\/group\/\d+\/[-A-Za-z0-9_]{0,}\/chapters(\/?|\/\d+\/?)$/,
// 		/\/user\/\d+(\/[-A-Za-z0-9_]{0,}\/?)?$/,
// 		/\/user\/\d+\/[-A-Za-z0-9_]{0,}\/chapters(\/?|\/\d+\/?)$/,
// 	],
// 	async () => {
// 		console.log("ChapterListPage");
// 	}
// );
router.add([/^\/chapter\/(\d+|[-A-Za-z0-9]{36})\/(\d+)\/?/], Chapter);
router.add(
	[
		/\/follows\/manga(\/?|\/\d(\/?|\/\d+(\/?|\/\d+\/?)))$/,
		/\/group\/\d+\/[-A-Za-z0-9_]{0,}\/manga(\/?|\/\d+\/?)$/,
		/\/user\/\d+\/[-A-Za-z0-9_]{0,}\/manga(\/?|\/\d+\/?)$/,
		/\/(search|\?page=search.*)/,
		/\/(titles|\?page=titles.*)/,
		/\/genre(\/\d+)?$/,
		/\/featured$/,
	],
	ChapterList,
	undefined
);
router.add([/^\/manga\/(\d+)\/?/, /^\/title\/([-A-Za-z0-9]{36})\/?/], Title);
router.add([/^\/(title|manga)(\/random)\/?/], Title, undefined);
// router.add([/\/updates(\/?$|\/\d+\/?)$/], async () => {
// 	console.log("UpdatesPage");
// });
// router.add([/\/history$/], async () => {
// 	console.log("HistoryPage");
// });

// * Clear Overlay title between routes

router.onBeforeRoute((_, __) => {
	Tachikoma.clearTitle();
});

// * Wait until MangaDex loaded to do anything

document.addEventListener("md:ready", async () => {
	await Options.load();
	router.execute(window.location.pathname);
	router.watch();
});

injectScript(() => {
	if (window.$nuxt === undefined) {
		const initObserver = new MutationObserver((mutations, observer) => {
			document.dispatchEvent(new CustomEvent("md:ready"));
			observer.disconnect();
		});
		initObserver.observe(document.body, { childList: true, subtree: true });
	} else {
		document.dispatchEvent(new CustomEvent("md:ready"));
	}
});
