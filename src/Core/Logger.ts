import { DateTime } from "luxon";

type Mode = "log" | "debug" | "info" | "success" | "warning" | "error";

const headerStyle = "color: #fff; background-color: #6e7dab; padding: 2px; border-radius: 6px;";
const timestampStyle = "color: #fff; background-color: black; padding: 2px; border-radius: 4px;";
const modeStyles: Record<Mode, string> = {
	log: "background-color: #fff; color: #000; padding: 2px",
	debug: "background-color: #808b96; color: #fff; padding: 2px",
	info: "background-color: #8e9abd; color: #fff; padding: 2px",
	success: "background-color: #2ecc71; color: #145a32; padding: 2px",
	warning: "background-color: #e67e22; color: #fff; padding: 2px",
	error: "background-color: #e74c3c; color: #fff; padding: 2px",
};
function print(mode: Mode, ...messages: any[]) {
	if (messages.length == 1 && typeof messages[0] !== "object" && typeof messages[0] !== "function") {
		console.log(
			`%ctachikoma%c %c${DateTime.now()}%c %c${messages[0]}`,
			headerStyle,
			"",
			timestampStyle,
			"",
			modeStyles[mode]
		);
	} else {
		console.log(`%ctachikoma%c %c${DateTime.now()}`, headerStyle, "", timestampStyle, ...messages);
	}
}

// TODO [Option] logLevel: 1..3
// TODO [Feature] hide or show log with the log level option

export function log(...messages: any[]) {
	print("log", ...messages);
}

export function debug(...messages: any[]) {
	print("debug", ...messages);
}

export function info(...messages: any[]) {
	print("info", ...messages);
}

export function success(...messages: any[]) {
	print("success", ...messages);
}

export function warn(...messages: any[]) {
	print("warning", ...messages);
}

export function error(...messages: any[]) {
	print("error", ...messages);
}
