import { toastStore } from './toast.js';

export class NotificationManager {
  private static show(message: string, type: 'success' | 'error' | 'info' = 'info') {
    toastStore.add(message, type);

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

export function handleDatabaseError(error: unknown, operation: string): boolean {
  console.error(`Database error during ${operation}:`, error);
  NotificationManager.showError(`Something went wrong - couldn't ${operation}.`);
  return false;
}

export function getDisplayName(displayName: string | null, username: string): string {
  return displayName || username;
}
