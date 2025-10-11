import { browser } from '$app/environment';

interface Friend {
	id: string;
	display_name: string | null;
	username: string;
	status: string | null;
	status_updated_at: string | null;
}

class FriendOrderStore {
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
			// If no order is stored, use the original order and save it
			this.order = friends.map(friend => friend.id);
			this.saveToStorage();
			return friends;
		}

		// Create a map for quick lookup
		const friendMap = new Map(friends.map(friend => [friend.id, friend]));

		// Build ordered array based on stored order
		const orderedFriends: Friend[] = [];
		const remainingFriends: Friend[] = [];

		// First, add friends in the stored order
		for (const friendId of this.order) {
			const friend = friendMap.get(friendId);
			if (friend) {
				orderedFriends.push(friend);
			}
		}

		// Then add any new friends that weren't in the stored order
		for (const friend of friends) {
			if (!this.order.includes(friend.id)) {
				remainingFriends.push(friend);
			}
		}

		// Combine ordered and remaining friends
		const result = [...orderedFriends, ...remainingFriends];

		// Update the stored order to include any new friends
		this.order = result.map(friend => friend.id);
		this.saveToStorage();

		return result;
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

	/**
	 * Clear the stored order (useful for testing or reset)
	 */
	clearOrder(): void {
		this.order = [];
		if (browser) {
			localStorage.removeItem(this.STORAGE_KEY);
		}
	}
}

// Export a singleton instance
export const friendOrderStore = new FriendOrderStore();
