import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../database.types';

interface SubscriptionCallbacks {
	onFriendRequestChange?: () => void;
	onFriendshipChange?: () => void;
	onStatusChange?: () => void;
}

/**
 * Manages real-time Supabase subscriptions for dashboard updates.
 *
 * Uses server-side column filters so only rows relevant to this user are
 * delivered over the wire. The friend_requests and friends tables each
 * require two channels because Realtime only supports a single `eq` filter
 * per channel — one for each column that can reference the current user.
 *
 * The profiles subscription is scoped to the user's friend list via an `in`
 * filter and is (re)created whenever the friend list changes via
 * `updateFriendIds()`. It is not set up until the first call to that method.
 */
export class RealtimeSubscriptionManager {
	private supabase: SupabaseClient<Database>;
	private userId: string;
	/** Channels that live for the whole session (friend_requests + friends). */
	private channels: RealtimeChannel[] = [];
	/** The profiles channel — replaced whenever the friend list changes. */
	private profileChannel: RealtimeChannel | null = null;
	private callbacks: SubscriptionCallbacks = {};
	/** Sorted snapshot of the friend IDs the profile channel is scoped to. */
	private subscribedFriendIds: string[] = [];

	constructor(supabase: SupabaseClient<Database>, userId: string) {
		this.supabase = supabase;
		this.userId = userId;
	}

	/**
	 * Open channels for friend_requests and friends table changes.
	 * The profiles channel is NOT started here; call `updateFriendIds` once
	 * dashboard data is available.
	 */
	subscribe(callbacks: SubscriptionCallbacks): void {
		this.callbacks = callbacks;
		this.subscribeToFriendRequests();
		this.subscribeToFriends();
	}

	/**
	 * (Re)create the profiles subscription scoped to the given friend IDs.
	 * Safe to call on every data refresh — it is a no-op when the list has
	 * not changed since the last call.
	 */
	updateFriendIds(friendIds: string[]): void {
		const sorted = [...friendIds].sort();

		// No-op if the friend list is identical to what we already have.
		const unchanged =
			sorted.length === this.subscribedFriendIds.length &&
			sorted.every((id, i) => id === this.subscribedFriendIds[i]);
		if (unchanged) return;

		this.subscribedFriendIds = sorted;

		if (this.profileChannel) {
			this.supabase.removeChannel(this.profileChannel);
			this.profileChannel = null;
		}

		if (sorted.length > 0) {
			this.profileChannel = this.openProfileChannel(sorted);
		}
	}

	/**
	 * Two channels for friend_requests — one per column that can reference
	 * the current user — so the server delivers only relevant rows.
	 */
	private subscribeToFriendRequests(): void {
		// Requests sent by this user (outgoing).
		const outgoing = this.supabase
			.channel(`friend_requests_from_${this.userId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'friend_requests',
					filter: `requester_id=eq.${this.userId}`
				},
				() => this.callbacks.onFriendRequestChange?.()
			)
			.subscribe((_, err) => {
				if (err) console.error('Realtime: friend_requests (outgoing) error:', err);
			});

		// Requests sent to this user (incoming).
		const incoming = this.supabase
			.channel(`friend_requests_to_${this.userId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'friend_requests',
					filter: `target_id=eq.${this.userId}`
				},
				() => this.callbacks.onFriendRequestChange?.()
			)
			.subscribe((_, err) => {
				if (err) console.error('Realtime: friend_requests (incoming) error:', err);
			});

		this.channels.push(outgoing, incoming);
	}

	/**
	 * Two channels for friends — one per column that can reference the
	 * current user (the canonical ordering means user_id < friend_id, so
	 * the user could appear in either column).
	 */
	private subscribeToFriends(): void {
		// Friendships where this user is stored as user_id.
		const asUser = this.supabase
			.channel(`friends_user_${this.userId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'friends',
					filter: `user_id=eq.${this.userId}`
				},
				() => this.callbacks.onFriendshipChange?.()
			)
			.subscribe((_, err) => {
				if (err) console.error('Realtime: friends (as user_id) error:', err);
			});

		// Friendships where this user is stored as friend_id.
		const asFriend = this.supabase
			.channel(`friends_friend_${this.userId}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'friends',
					filter: `friend_id=eq.${this.userId}`
				},
				() => this.callbacks.onFriendshipChange?.()
			)
			.subscribe((_, err) => {
				if (err) console.error('Realtime: friends (as friend_id) error:', err);
			});

		this.channels.push(asUser, asFriend);
	}

	/**
	 * Open a profiles channel scoped to the supplied friend IDs using an
	 * `in` filter. Only UPDATE events on those specific rows are delivered,
	 * eliminating the previous behaviour of receiving every profile change
	 * from every user in the database.
	 */
	private openProfileChannel(friendIds: string[]): RealtimeChannel {
		return this.supabase
			.channel(`profiles_friends_${this.userId}`)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'profiles',
					filter: `id=in.(${friendIds.join(',')})`
				},
				() => this.callbacks.onStatusChange?.()
			)
			.subscribe((_, err) => {
				if (err) console.error('Realtime: profiles error:', err);
			});
	}

	/** Tear down all channels and reset state. */
	unsubscribe(): void {
		for (const channel of this.channels) {
			this.supabase.removeChannel(channel);
		}
		if (this.profileChannel) {
			this.supabase.removeChannel(this.profileChannel);
			this.profileChannel = null;
		}
		this.channels = [];
		this.callbacks = {};
		this.subscribedFriendIds = [];
	}
}
