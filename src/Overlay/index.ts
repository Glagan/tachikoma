import FloatingOverlay from "./index.svelte";
import "light-icons/dist/light-icon.css";
import "../Core/tailwind.css";
import type Title from "@Core/Title";

export namespace Overlay {
	let overlay: FloatingOverlay;

	export function create() {
		const existing = document.getElementById("tachikoma__overlay");
		if (existing) {
			existing.remove();
		}

		const container = document.createElement("div");
		container.id = "tachikoma__overlay";
		document.body.appendChild(container);

		overlay = new FloatingOverlay({ target: container });
	}

	export function setTitle(title: Title) {
		if (overlay) {
			overlay.$set({ title });
		} else {
			console.warn("Overlay.setTitle called without Overlay.create called before");
		}
	}
}
