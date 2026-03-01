import { writable } from 'svelte/store';

export interface Toast {
	id: string;
	message: string;
	type: 'success' | 'error' | 'info';
	duration?: number;
}

export const toasts = writable<Toast[]>([]);

let toastIdCounter = 0;

export const toastStore = {
	add: (message: string, type: Toast['type'] = 'info', duration = 5000) => {
		const id = `toast-${++toastIdCounter}`;
		const toast: Toast = { id, message, type, duration };

		toasts.update((current) => [...current, toast]);

		if (duration > 0) {
			setTimeout(() => {
				toastStore.remove(id);
			}, duration);
		}

		return id;
	},

	remove: (id: string) => {
		toasts.update((current) => current.filter((toast) => toast.id !== id));
	},

	clear: () => {
		toasts.set([]);
	},

	success: (message: string, duration = 5000) => toastStore.add(message, 'success', duration),
	error: (message: string, duration = 8000) => toastStore.add(message, 'error', duration),
	info: (message: string, duration = 5000) => toastStore.add(message, 'info', duration)
};
