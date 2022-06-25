import MangaDex from "@Service/MangaDex";
import MangaDexOptions from "./MangaDex/options";

export default {
	[MangaDex.name]: { key: MangaDex.key, enabledOptions: MangaDexOptions },
} as SiteEnabledOptions;
