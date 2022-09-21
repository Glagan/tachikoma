/**
 * Title
 */

type TitleIdentifier = Record<any, any>;

type ServiceList = { [key: string]: TitleIdentifier };

type TitleStorageInterface = {
	i: number; // ID
	n?: string; // Name
	h?: string; // Thumbnail
	c: number; // Chapter
	v?: number; // Volume
	s: Status; // Status
	r?: [number, number, number]; // Score
	t?: number; // Start Date
	e?: number; // End Date
	l?: string[]; // Locked Services
	$?: ServiceList; // Services
	o?: number; // Creation Date
	u?: number; // Last Update
	a?: number; // Last Access
};

type ServiceLoginInformations = Record<any, any>;

interface Progress {
	chapter: number;
	volume?: number;
	oneshot?: boolean;
}
