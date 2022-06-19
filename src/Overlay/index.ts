import FloatingOverlay from "./index.svelte";
import "light-icons/dist/light-icon.css";
import "../Core/tailwind.css";
import type Title from "@Core/Title";

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

	setTitle(title: Title) {
		this.overlay.$set({ title });
	}
}
