import MyAnimeList from "@Service/MyAnimeList";
import type { Links } from "./API";

/**
 * Find the ID of a MangaDex title OR chapter by looking at it's URL.
 * A MangaDex Title ID is 36 characters long with only alphanumeric characters separated by -.
 * @param link
 * @param mode
 */
export function IDFromLink(link: HTMLAnchorElement | string, mode: "title" | "chapter"): string {
	const url = typeof link === "string" ? link : link.href!;
	if (mode == "chapter") {
		return /\/chapter\/([a-zA-Z0-9-]{36})(?:\/.*)?$/.exec(url)![1];
	}
	return /\/title\/([a-zA-Z0-9-]{36})(?:\/.*)?$/.exec(url)![1];
}

/**
 * All possible formats: `Chapter\s+\d+(.\d+)?(\s+.+)?` | `Oneshot`
 * @param raw
 */
export function chapterFromString(raw: string): string {
	if (raw.toLocaleLowerCase() == "oneshot") {
		return "oneshot";
	}
	const regres = /^Chapter\s+(\d+(?:\.\d+)?)/i.exec(raw);
	if (regres == null) return "";
	return regres[1];
}

/**
 * Visual representation of a chapter and volume (or oneshot) pair.
 * Output "Oneshot" or "Vol. X Ch. Y" with Vol. optional.
 * @param chapter
 * @param volume
 * @param oneshot
 */
export function chapterToString(chapter: number, volume: number | null, oneshot?: boolean): string {
	const strVolume = volume && volume > 0 ? `Vol. ${volume}` : "";
	const strChapter = chapter >= 0 ? (volume ? ` Ch. ${chapter}` : `Chapter ${chapter}`) : "";
	return oneshot ? "Oneshot" : `${strVolume}${strChapter}`;
}

/**
 * All possible formats: `(Vol.\s+\d+,\s+)Ch.\s+\d+(.\d+)?(\s+.+)?` | `Oneshot`
 * Tests: regexr.com/646dq
 * @param raw
 */
export function fullChapterFromString(raw: string): Progress {
	const isOneshot = /vol(\.|ume)\s*\d+,?\s*oneshot/i.exec(raw) !== null;
	if (isOneshot || raw.toLocaleLowerCase() == "oneshot") {
		return {
			chapter: 1,
			volume: 1,
			oneshot: true,
		};
	}
	const regres = /(?:Vol(?:ume|\.)\s+(\d+),\s+)?Ch(?:apter|\.)\s+(\d+(?:\.\d+)?)/i.exec(raw);
	if (regres == null) return { chapter: 0 };
	return {
		chapter: parseFloat(regres[2]) || 0,
		volume: regres[1] ? parseInt(regres[1]) || undefined : undefined,
		oneshot: false,
	};
}

/**
 * Convert a list of services from their full names and the resource URL to a corresponding
 * tachikoma service and it's TitleIdentifier for the service.
 * @param services List of Service fullnames and their URL as stored in MangaDex
 * @returns List of services formatted for tachikoma
 */
export function convertServices(services: Links): { [key: string]: TitleIdentifier } {
	let converted: { [key: string]: TitleIdentifier } = {};
	if (services.mal) {
		converted[MyAnimeList.key] = { id: parseInt(services.mal) };
	} /* else if (services.al) {
	} */
	return converted;
}
