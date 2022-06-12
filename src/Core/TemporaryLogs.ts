import { DateTime } from "luxon";

export enum LogLevel {
	DEBUG,
	INFO,
	ERROR,
}

export type LogLine = {
	time: DateTime;
	level: LogLevel;
	message: string;
	meta?: Object;
};

export class TemporaryLogs {
	protected lines: LogLine[] = [];

	printLine(line: LogLine) {
		const method = line.level === LogLevel.DEBUG ? "debug" : line.level === LogLevel.INFO ? "info" : "error";
		console[method](line.time.toISO(), line.message, line.meta);
	}

	log(level: LogLevel, message: string, meta?: Object) {
		const line = { time: DateTime.now(), level, message, meta };
		this.lines.push(line);
		return line;
	}

	debug(message: string, meta?: Object) {
		this.printLine(this.log(LogLevel.DEBUG, message, meta));
	}

	info(message: string, meta?: Object) {
		this.printLine(this.log(LogLevel.DEBUG, message, meta));
	}

	error(message: string, meta?: Object) {
		this.printLine(this.log(LogLevel.DEBUG, message, meta));
	}

	getAll() {
		return this.lines;
	}

	getLevel(level: LogLevel) {
		return this.lines.filter((line) => line.level === level);
	}

	getHidden(level: LogLevel) {
		return this.lines.filter((line) => line.level < level);
	}

	printAll(level?: LogLevel) {
		const lines = level !== undefined ? this.getLevel(level) : this.lines;
		for (const line of lines) {
			this.printLine(line);
		}
	}
}

export default new TemporaryLogs();
