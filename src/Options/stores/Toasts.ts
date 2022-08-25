import { DateTime } from "luxon";
import { writable } from "svelte/store";

export type Toast = {
	id: number;
	type: "info" | "success" | "error";
	message: string;
	duration?: number;
};

export const toasts = (() => {
	let toasts: Toast[] = [];
	const { subscribe, set, update } = writable<Toast[]>(toasts);

	const remove = (id: number) => {
		toasts = toasts.filter((toast) => toast.id !== id);
		return set(toasts);
	};

	return {
		subscribe,
		set,
		update,
		push(toast: Omit<Toast, "id">): number {
			const id = DateTime.now().toMillis();
			toasts.push({ ...toast, id });
			setTimeout(() => {
				remove(id);
			}, toast.duration ?? 2000);
			set(toasts);
			return id;
		},
		remove,
	};
})();
