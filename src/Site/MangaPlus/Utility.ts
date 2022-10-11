/**
 * Extract a chapter number from a string `#000`
 */
export function chapterFromString(raw: string | undefined | null): number {
	const chapter = parseInt(raw?.trim().slice(1) ?? "");
	if (!chapter || isNaN(chapter)) {
		return 0;
	}
	return chapter;
}

export function IDfromString(raw: string | undefined | null): number | undefined {
	const match = raw?.match(/\/titles\/(\d+)\/?/);
	const id = match ? parseInt(match[1]) : undefined;
	if (!id || isNaN(id)) {
		return undefined;
	}
	return id;
}
