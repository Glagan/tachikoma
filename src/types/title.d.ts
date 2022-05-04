/**
 * Title
 */

type TitleIdentifier = Record<any, any>;

declare const enum Status {
	NONE,
	READING,
	COMPLETED,
	PAUSED,
	PLAN_TO_READ,
	DROPPED,
	REREADING,
	WONT_READ,
}

type DateTime = import("luxon").DateTime;

type ServiceList = { [key: string]: TitleIdentifier };

type TitleInterface = {
	// Local **tachikoma** id
	id?: number;
	// Favorite name for the title
	name?: string;

	// Last read chapter
	chapter: number;
	// Volume of the current chapter
	volume?: number;
	// Stauts of the title
	status: Status;

	// Score from any given range
	score?: import("@Core/Score").Score;

	// Start time (automatically updated)
	startDate?: DateTime;
	// End time (automatically updated)
	endDate?: DateTime;

	// List of locked Service keys
	lockedServices?: string[];
	// List of {Service.key}
	services: ServiceList;
	// Creation time
	creation?: DateTime;
	// Last update time
	lastUpdate?: DateTime;
	// Last access time (update in all pages)
	lastAccess?: DateTime;
};

type TitleStorageInterface = {
	i: number; // ID
	n?: string; // Name
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
