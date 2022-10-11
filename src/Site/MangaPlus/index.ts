import { Options } from "@Core/Options";
import Router from "@Core/Router";
import Tachikoma from "@Core/Tachikoma";
import { info } from "@Core/Logger";
import Chapter from "./Pages/Chapter";
import Title from "./Pages/Title";
import ChapterList from "./Pages/ChapterList";
import "./highlight.css";

info("[MangaPlus]");

// * Setup router
const router = new Router();
router.add([/^\/manga_list\/all\/?$/, /^\/featured\/?$/], async () => {
	info("Title List Page");
});
router.add([/^\/viewer\/(\d+)\/?/], Chapter);
router.add([/^\/updates\/?$/], ChapterList);
router.add([/^\/titles\/(\d+)\/?/], Title);

// * Clear Overlay title between routes
router.onBeforeRoute((_, __) => {
	Tachikoma.clearTitle();
});

// * Start
(async () => {
	await Options.load();
	router.execute(window.location.pathname);
	router.watch();
})();
