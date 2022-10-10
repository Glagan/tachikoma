import MangaDex from "@Service/MangaDex";
import MangaDexOptions from "./MangaDex/options";
import MangaPlusKey from "./MangaPlus/key";
import MangaPlusOptions from "./MangaPlus/options";

export default {
	[MangaDex.name]: { key: MangaDex.key, enabledOptions: MangaDexOptions },
	["MangaPlus"]: { key: MangaPlusKey, enabledOptions: MangaPlusOptions },
} as SiteEnabledOptions;
