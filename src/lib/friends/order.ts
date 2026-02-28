import { browser } from '$app/environment';

interface Friend {
	id: string;
	display_name: string | null;
	username: string;
	status: string | null;
	status_updated_at: string | null;
}

export class FriendOrderStore {
	private order: string[] = [];
	private readonly STORAGE_KEY = 'friend-order';

	constructor() {
		this.loadFromStorage();
	}

	/**
	 * Load the friend order from localStorage
	 */
	private loadFromStorage(): void {
		if (!browser) return;

		try {
			const stored = localStorage.getItem(this.STORAGE_KEY);
			if (stored) {
				this.order = JSON.parse(stored);
			}
		} catch (error) {
			console.warn('Failed to load friend order from localStorage:', error);
			this.order = [];
		}
	}

	/**
	 * Save the current order to localStorage
	 */
	private saveToStorage(): void {
		if (!browser) return;

		try {
			localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.order));
		} catch (error) {
			console.warn('Failed to save friend order to localStorage:', error);
		}
	}

	/**
	 * Get the ordered friends array based on the stored order
	 */
	getOrderedFriends(friends: Friend[]): Friend[] {
		if (this.order.length === 0) {
			// No stored order — persist the incoming order and return it as-is
			this.order = friends.map((f) => f.id);
			this.saveToStorage();
			return friends;
		}

		const storedSet = new Set(this.order);
		const friendMap = new Map(friends.map((f) => [f.id, f]));

		// Apply stored order, skipping IDs no longer in the friend list
		const ordered: Friend[] = [];
		for (const id of this.order) {
			const f = friendMap.get(id);
			if (f) ordered.push(f);
		}

		// Collect friends not yet in the stored order (newly added friends)
		const newFriends = friends.filter((f) => !storedSet.has(f.id));

		if (newFriends.length > 0) {
			// Append new friends and persist the updated order
			const result = [...ordered, ...newFriends];
			this.order = result.map((f) => f.id);
			this.saveToStorage();
			return result;
		}

		return ordered;
	}

	/**
	 * Update the order when friends are reordered via drag and drop
	 */
	updateOrder(newOrder: Friend[]): void {
		this.order = newOrder.map(friend => friend.id);
		this.saveToStorage();
	}

	/**
	 * Remove a friend from the order when they are deleted
	 */
	removeFriend(friendId: string): void {
		this.order = this.order.filter(id => id !== friendId);
		this.saveToStorage();
	}

}

// Export a singleton instance
export const friendOrderStore = new FriendOrderStore();
