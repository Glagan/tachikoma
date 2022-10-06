import { Options } from "@Core/Options";
import Router from "@Core/Router";
import Tachikoma from "@Core/Tachikoma";
import { info } from "@Core/Logger";
import Chapter from "./Pages/Chapter";
import Title from "./Pages/Title";
import ChapterList from "./Pages/ChapterList";
import "./index.css";
import MyAnimeList from "@Service/MyAnimeList";
import MangaDex from "@Service/MangaDex";

const router = new Router();
router.add([/\/titles$/, /\/titles\/recent$/, /\/titles\/seasonal$/, /\/titles\/follows$/], async () => {
	info("Title List Page");
});
router.add([/\/group\/([-A-Za-z0-9]{36})\//], async () => {
	info("Group Page");
});
router.add([/\/user\/([-A-Za-z0-9]{36})\//], async () => {
	info("User Page");
});
router.add([/^\/chapter\/(\d+|[-A-Za-z0-9]{36})\/(\d+)\/?/], Chapter);
router.add([/\/titles\/latest$/, /\/titles\/feed$/], ChapterList, undefined);
router.add([/^\/manga\/(\d+)\/?/, /^\/title\/([-A-Za-z0-9]{36})\/?/], Title);
router.add([/^\/(title|manga)(\/random)\/?/], Title, undefined);
router.add([/\/my\/history$/], async () => {
	info("HistoryPage");
});

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

// $nuxt isn't found in window on script refresh on firefox...
if (window.$nuxt === undefined) {
	const initObserver = new MutationObserver((mutations, observer) => {
		document.dispatchEvent(new CustomEvent("md:ready"));
		observer.disconnect();
	});
	initObserver.observe(document.body, { childList: true, subtree: true });
} else {
	document.dispatchEvent(new CustomEvent("md:ready"));
}

MyAnimeList.search("berserk");
MangaDex.search("berserk");
