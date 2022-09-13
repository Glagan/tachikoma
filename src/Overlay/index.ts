import "light-icons/dist/light-icon.css";
import FloatingOverlay from "./index.svelte";
import type Title from "@Core/Title";
import { file } from "@Core/Utility";
import "../Core/tailwind.css";

export const icons = {
	loading: file("/static/loading_64.png"),
	inactive: file("/static/sleepy_64.png"),
};

export default class Overlay {
	overlay: FloatingOverlay;

	constructor() {
		const existing = document.getElementById("tachikoma__overlay");
		if (existing) {
			existing.remove();
		}

		const container = document.createElement("div");
		container.id = "tachikoma__overlay";
		document.body.appendChild(container);

		this.overlay = new FloatingOverlay({ target: container });
	}

	setTitle(title?: Title) {
		this.overlay.$set({ title });
	}

	setCover(cover?: string) {
		this.overlay.$set({ cover });
	}

	setLoading(loading: boolean) {
		this.overlay.$set({ loading });
	}
}
