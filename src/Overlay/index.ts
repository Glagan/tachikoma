import FloatingOverlay from "./index.svelte";
import "light-icons/dist/light-icon.css";
import "./index.css";
import type Title from "@Core/Title";

export namespace Overlay {
	export function create(title: Title) {
		const existing = document.getElementById("tachikoma__overlay");
		if (existing) {
			existing.remove();
		}

		const container = document.createElement("div");
		container.id = "tachikoma__overlay";
		document.body.appendChild(container);

		return new FloatingOverlay({ target: container, props: { title } });
	}
}
