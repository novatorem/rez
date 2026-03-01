import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FriendOrderStore } from './order';

const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn((index: number) => Object.keys(store)[index] ?? null)
	};
})();

Object.defineProperty(globalThis, 'window', {
	value: { localStorage: localStorageMock },
	writable: true
});
Object.defineProperty(globalThis, 'localStorage', {
	value: localStorageMock,
	writable: true
});

vi.mock('$app/environment', () => ({ browser: true }));

function makeFriend(id: string) {
	return { id, username: id, display_name: null, status: null, status_updated_at: null };
}

describe('FriendOrderStore', () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.clearAllMocks();
	});

	it('returns friends in original order when no order is stored', () => {
		const store = new FriendOrderStore();
		const friends = [makeFriend('a'), makeFriend('b'), makeFriend('c')];

		const ordered = store.getOrderedFriends(friends);
		expect(ordered.map((f) => f.id)).toEqual(['a', 'b', 'c']);
	});

	it('persists order to localStorage on first call', () => {
		const store = new FriendOrderStore();
		const friends = [makeFriend('a'), makeFriend('b')];

		store.getOrderedFriends(friends);
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			'friend-order',
			JSON.stringify(['a', 'b'])
		);
	});

	it('applies stored order', () => {
		localStorageMock.setItem('friend-order', JSON.stringify(['c', 'a', 'b']));
		const store = new FriendOrderStore();
		const friends = [makeFriend('a'), makeFriend('b'), makeFriend('c')];

		const ordered = store.getOrderedFriends(friends);
		expect(ordered.map((f) => f.id)).toEqual(['c', 'a', 'b']);
	});

	it('appends new friends to the end', () => {
		localStorageMock.setItem('friend-order', JSON.stringify(['a', 'b']));
		const store = new FriendOrderStore();
		const friends = [makeFriend('a'), makeFriend('b'), makeFriend('c')];

		const ordered = store.getOrderedFriends(friends);
		expect(ordered.map((f) => f.id)).toEqual(['a', 'b', 'c']);
	});

	it('skips IDs no longer in the friend list', () => {
		localStorageMock.setItem('friend-order', JSON.stringify(['a', 'b', 'c']));
		const store = new FriendOrderStore();
		const friends = [makeFriend('a'), makeFriend('c')];

		const ordered = store.getOrderedFriends(friends);
		expect(ordered.map((f) => f.id)).toEqual(['a', 'c']);
	});

	it('updateOrder persists new order', () => {
		const store = new FriendOrderStore();
		const reordered = [makeFriend('c'), makeFriend('a'), makeFriend('b')];

		store.updateOrder(reordered);
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			'friend-order',
			JSON.stringify(['c', 'a', 'b'])
		);
	});

	it('removeFriend removes from stored order', () => {
		localStorageMock.setItem('friend-order', JSON.stringify(['a', 'b', 'c']));
		const store = new FriendOrderStore();
		store.getOrderedFriends([makeFriend('a'), makeFriend('b'), makeFriend('c')]);

		store.removeFriend('b');
		const stored = JSON.parse(localStorageMock.getItem('friend-order')!);
		expect(stored).toEqual(['a', 'c']);
	});
});
