import { toastStore } from './toast.js';

// Notification system using DaisyUI toast components
export class NotificationManager {
	private static show(message: string, type: 'success' | 'error' | 'info' = 'info') {
		// Use the toast store to display notifications
		toastStore.add(message, type);

		// Keep console logging for errors for debugging
		if (type === 'error') {
			console.error(message);
		}
	}

	static showError(message: string) {
		this.show(message, 'error');
	}

	static showSuccess(message: string) {
		this.show(message, 'success');
	}
}

// Database error handler
export function handleDatabaseError(error: unknown, operation: string): boolean {
	console.error(`Database error during ${operation}:`, error);
	NotificationManager.showError(`Failed to ${operation}`);
	return false;
}

// Display name utility
export function getDisplayName(displayName: string | null, username: string): string {
	return displayName || username;
}
