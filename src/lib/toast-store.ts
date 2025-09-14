import { writable } from 'svelte/store';

export interface Toast {
	id: string;
	message: string;
	type: 'success' | 'error' | 'info';
	duration?: number; // milliseconds, undefined means no auto-dismiss
}

// Store for managing toast notifications
export const toasts = writable<Toast[]>([]);

let toastIdCounter = 0;

export const toastStore = {
	// Add a new toast
	add: (message: string, type: Toast['type'] = 'info', duration = 5000) => {
		const id = `toast-${++toastIdCounter}`;
		const toast: Toast = { id, message, type, duration };

		toasts.update((current) => [...current, toast]);

		// Auto-dismiss after duration if specified
		if (duration > 0) {
			setTimeout(() => {
				toastStore.remove(id);
			}, duration);
		}

		return id;
	},

	// Remove a specific toast
	remove: (id: string) => {
		toasts.update((current) => current.filter((toast) => toast.id !== id));
	},

	// Clear all toasts
	clear: () => {
		toasts.set([]);
	},

	// Convenience methods
	success: (message: string, duration = 5000) => toastStore.add(message, 'success', duration),
	error: (message: string, duration = 8000) => toastStore.add(message, 'error', duration), // Errors stay longer
	info: (message: string, duration = 5000) => toastStore.add(message, 'info', duration)
};
