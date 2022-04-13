export const OPTIONS_KEY = "~options" as const;
export const NEXT_KEY = "@next" as const;

export type BasicToken = {
	token: string;
	refresh: string;
};

export type StorageTitle = {
	[key: `_${number}`]: TitleStorageInterface | undefined;
	[key: `=${string}>${string}`]: number | undefined;
};

export type StorageService = {
	[key: `$${string}`]: Record<string, any> | undefined;
};

export type StorageMap = {
	[OPTIONS_KEY]: OptionList;
	[NEXT_KEY]: number;
} & StorageTitle &
	StorageService;
