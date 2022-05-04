export type Range = [number, number];

/**
 * Helper class to handle Score with different ranges with automatic convertion.
 */
export class Score {
	range: Range = [0, 100];
	value!: number;

	constructor(score: Score);
	constructor(value: number, range?: Range);
	constructor(valueOrScore: number | Score, range?: Range) {
		if (typeof valueOrScore === "number") {
			if (range) this.range = range;
			this.setValue(valueOrScore);
		} else {
			this.value = valueOrScore.value;
			this.range = [...valueOrScore.range];
		}
	}

	setValue(score: Score): void;
	setValue(score: number, range?: Range): void;
	setValue(valueOrScore: number | Score, range?: Range): void {
		if (typeof valueOrScore !== "number") {
			range = valueOrScore.range;
			valueOrScore = valueOrScore.value;
		}
		if (!range) {
			range = this.range;
		}
		if (valueOrScore < range[0]) {
			valueOrScore = range[0];
		}
		if (valueOrScore > range[1]) {
			valueOrScore = range[1];
		}
		if (this.range[0] != range[0] || this.range[1] != range[1]) {
			this.value = Score.convertValueRange(valueOrScore, range, this.range);
		} else {
			this.value = valueOrScore;
		}
	}

	setRange(range: Range) {
		if (range[0] != this.range[0] || range[1] != this.range[1]) {
			this.value = Score.convertValueRange(this.value, this.range, range);
			this.range = [...range];
		}
	}

	get(score?: Score): number;
	get(range?: Range): number;
	get(scoreOrRange?: Score | Range): number {
		if (scoreOrRange) {
			const range = Array.isArray(scoreOrRange) ? scoreOrRange : scoreOrRange.range;
			if (range[0] != this.range[0] || range[1] != this.range[1]) {
				return Score.convertValueRange(this.value, this.range, range);
			}
		}
		return this.value;
	}

	equal(score: Score) {
		const otherValue = score.get(this);
		return this.value === otherValue;
	}

	static convertValueRange(value: number, oldRange: Range, newRange: Range): number {
		const scale = (newRange[1] - newRange[0]) / (oldRange[1] - oldRange[0]);
		return newRange[0] + (value - oldRange[0]) * scale;
	}
}
