import { debug } from "@Core/Logger";
import SitesOptions from "@Site/options";

type SimpleOptionType = "color" | "colorList" | "string";
type ToggleOptionType = "toggle";
type NumberOptionType = "number";
type OptionType = SimpleOptionType | ToggleOptionType | NumberOptionType;

export type BaseOptionDescription = {
	name: string;
	description: string;
	type: OptionType;
};
export type SimpleOptionDescription = BaseOptionDescription & {
	type: SimpleOptionType;
};
export type ToggleOptionDescription = BaseOptionDescription & {
	type: ToggleOptionType;
	sub?: {
		[key in MutableOption]?: OptionDescription;
	};
};
export type NumberOptionDescription = BaseOptionDescription & {
	type: NumberOptionType;
	min?: number;
	max?: number;
};
export type OptionDescription = SimpleOptionDescription | ToggleOptionDescription | NumberOptionDescription;

type CategorizedOptions = {
	[key: string]: {
		description?: string;
		icon?: string;
		list: {
			[key: string]: {
				description?: string;
				icon: string;
				list: {
					[key in MutableOption]?: OptionDescription;
				};
			};
		};
	};
};

type LeafOptionList = {
	[key: string]: {
		description?: string;
		icon?: string;
		list: {
			[key in RootSiteMutableOption]?: OptionDescription;
		};
	};
};

const defaultOptionsList: LeafOptionList = {
	Highlight: {
		icon: "light-icon-brush",
		list: {
			"colors.enabled": {
				name: "Highlight chapter rows",
				description:
					"Paint chapter rows if they match a criteria.\nYou can use **transparent** to avoid painting the row.",
				type: "toggle",
				sub: {
					"colors.highlights": {
						name: "Last chapters",
						description: "Colors for all **current** chapters.\ntachikoma will cycle trough them.",
						type: "colorList",
					},
					"colors.nextChapter": {
						name: "Next chapter",
						description: "Color of the row when a chapter is the next one.",
						type: "color",
					},
					"colors.higherChapter": {
						name: "Higher chapter",
						description: "Color of the rows that are higher than the last one you read.",
						type: "color",
					},
					"colors.lowerChapter": {
						name: "Lower chapter",
						description: "Color of the rows that are lower than the last one you read.",
						type: "color",
					},
					"colors.openedChapter": {
						name: "Opened chapters",
						description: "Color of the rows of opened chapters.",
						type: "color",
					},
				},
			},
		},
	},
	Updates: {
		icon: "light-icon-refresh",
		list: {
			"reading.saveOnlyNext": {
				name: "Sync only next chapter",
				description:
					"Sync the current chapter only if it's detected as the next one.\nIf **Confirm Chapter** is enabled, it will prompt you if you still want to sync.",
				type: "toggle",
			},
			"reading.saveOnlyHigher": {
				name: "Sync only higher chapter",
				description:
					"Sync the current chapter only if it's **higher** from the last one you read.\nIf **Confirm Chapter** is enabled, it will prompt you if you still want to sync.",
				type: "toggle",
			},
			"reading.updateOnlyInList": {
				name: "Sync if in list",
				description:
					"Sync the current chapter only if it's already in your **MangaDex** list.\nIf **Confirm Chapter** is enabled, it will prompt you if you still want to sync.",
				type: "toggle",
			},
			"reading.confirmChapter": {
				name: "Confirm chapter",
				description:
					"Prompt to confirm sync if any of the conditions above are not met to still sync to the current chapter.",
				type: "toggle",
			},
			"reading.saveOnLastPage": {
				name: "Sync on last chapter page",
				description: "Sync the current chapter when you reach the last page instead of when it's opened.",
				type: "toggle",
			},
			"reading.saveOpenedChapters": {
				name: "Save chapter history",
				description:
					"Save a local history of the last chapters you read for each titles.\nThe saved list is used to highlight rows and display an history.",
				type: "toggle",
				sub: {
					"reading.chaptersSaved": {
						name: "Saved chapters",
						description: "Amount of chapters saved **for each titles**.",
						type: "number",
						min: 1,
						max: 500,
					},
				},
			},
		},
	},
	Lists: {
		icon: "light-icon-list",
		list: {
			"lists.hideHigher": {
				name: "Hide higher chapters",
				description: "Hide all chapters that are higher than the last one you read for the title.",
				type: "toggle",
			},
			"lists.hideLower": {
				name: "Hide lower chapters",
				description: "Hide all chapters that are lower than the last one you read for the title.",
				type: "toggle",
			},
			"lists.hideLast": {
				name: "Hide last chapter",
				description: "Hide the last chapter that you read for the title.",
				type: "toggle",
			},
		},
	},
	Notifications: {
		icon: "light-icon-bell",
		list: {
			"notifications.enabled": {
				name: "Show notifications",
				description:
					"Show some notifications after syncing a title or before a long operation.\nError notifications will still be displayed unless you also toggle them off below.\nConfirmation notifications are always displayed.",
				type: "toggle",
			},
			"notifications.successDuration": {
				name: "Success notifications duration",
				description: "Success notifications duration in milliseconds.",
				type: "number",
			},
			"notifications.infoDuration": {
				name: "Information notifications duration",
				description: "Information notifications duration in milliseconds.",
				type: "number",
			},
			"notifications.errorNotifications": {
				name: "Show error notifications",
				description: "Show error notifications.",
				type: "toggle",
			},
			"notifications.errorDuration": {
				name: "Error notifications duration",
				description: "Error notifications duration in milliseconds.",
				type: "number",
			},
			"notifications.displayProgressUpdated": {
				name: "Show sync summary",
				description: "Display a sync summary after a sync.",
				type: "toggle",
			},
		},
	},
};

export const descriptions: CategorizedOptions = {};
// Add Site specific option
for (const siteName in SitesOptions) {
	const siteOptions = SitesOptions[siteName];
	const filteredSiteOptions: {
		[key: string]: {
			description?: string;
			icon: string;
			list: {
				[key in MutableOption]?: OptionDescription;
			};
		};
	} = JSON.parse(JSON.stringify(defaultOptionsList));
	for (const category in filteredSiteOptions) {
		for (const subOption in filteredSiteOptions[category].list) {
			if (siteOptions.enabledOptions.indexOf(subOption as RootSiteMutableOption) >= 0) {
				const key = `${siteOptions.key}.${subOption}` as SiteMutableOption;
				filteredSiteOptions[category].list[key] =
					filteredSiteOptions[category].list[subOption as RootSiteMutableOption];
				const currentSubOption = filteredSiteOptions[category].list[key]!;
				if ("sub" in currentSubOption) {
					for (const toggleSubOption in currentSubOption.sub) {
						if (siteOptions.enabledOptions.indexOf(toggleSubOption as RootSiteMutableOption) >= 0) {
							const key = `${siteOptions.key}.${toggleSubOption}` as SiteMutableOption;
							currentSubOption.sub[key] = currentSubOption.sub[toggleSubOption as RootSiteMutableOption];
						}
						delete currentSubOption.sub[toggleSubOption as RootSiteMutableOption];
					}
				}
			}
			delete filteredSiteOptions[category].list[subOption as RootSiteMutableOption];
		}
		if (Object.keys(filteredSiteOptions[category].list).length == 0) {
			delete filteredSiteOptions[category];
		}
	}
	descriptions[siteName] = {
		icon: `file:/static/icons/${siteOptions.key}.png`,
		list: filteredSiteOptions,
	};
}
// Add Global last to keep the ordering
descriptions.Global = {
	icon: "file:/static/icons/tachikoma/16.png",
	description: "The global options are overwrite by the corresponding Site option when enabled.",
	list: {
		...JSON.parse(JSON.stringify(defaultOptionsList)),
		// Other: {
		// 	icon: "light-icon-settings",
		// 	list: {
		// 		useMochi: {
		// 			name: "Use Mochi",
		// 			description:
		// 				"Use Mochi to get list of services on top of the one **MangaDex** list.\nThis can possibly find missing services or fix some invalid services for some titles, or do the opposite.",
		// 			type: "toggle",
		// 		},
		// 	},
		// },
	},
};

debug("Calculated descriptions", descriptions);
