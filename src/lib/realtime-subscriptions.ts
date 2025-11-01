import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

interface SubscriptionCallbacks {
	onFriendRequestChange?: () => void;
	onFriendshipChange?: () => void;
	onStatusChange?: () => void;
}

/**
 * Manages real-time Supabase subscriptions for dashboard updates
 */
export class RealtimeSubscriptionManager {
	private supabase: SupabaseClient<Database>;
	private userId: string;
	private channels: RealtimeChannel[] = [];
	private callbacks: SubscriptionCallbacks = {};

	constructor(supabase: SupabaseClient<Database>, userId: string) {
		this.supabase = supabase;
		this.userId = userId;
	}

	/**
	 * Set up all real-time subscriptions
	 */
	subscribe(callbacks: SubscriptionCallbacks): void {
		this.callbacks = callbacks;

		// Subscribe to friend_requests table changes
		this.subscribeToFriendRequests();

		// Subscribe to friends table changes
		this.subscribeToFriends();

		// Subscribe to profiles table changes (for status updates)
		this.subscribeToProfiles();
	}

	/**
	 * Subscribe to friend_requests table changes
	 * Only listen to changes where the user is the requester or target
	 */
	private subscribeToFriendRequests(): void {
		const channel = this.supabase
			.channel(`friend_requests_${this.userId}`, {
				config: {
					broadcast: { self: true }
				}
			})
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'friend_requests'
				},
				(payload) => {
					// Check if this change is relevant to this user
					const newRecord = payload.new as { requester_id?: string; target_id?: string } | null;
					const oldRecord = payload.old as { requester_id?: string; target_id?: string } | null;
					const record = newRecord || oldRecord;

					if (
						record &&
						(record.requester_id === this.userId || record.target_id === this.userId)
					) {
						this.callbacks.onFriendRequestChange?.();
					}
				}
			)
			.subscribe((status, err) => {
				if (err) {
					console.error('Friend requests subscription error:', err);
				}
			});

		this.channels.push(channel);
	}

	/**
	 * Subscribe to friends table changes
	 * Only listen to changes where the user is involved in the friendship
	 */
	private subscribeToFriends(): void {
		const channel = this.supabase
			.channel(`friends_${this.userId}`, {
				config: {
					broadcast: { self: true }
				}
			})
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'friends'
				},
				(payload) => {
					// Check if this change is relevant to this user
					const newRecord = payload.new as { user_id?: string; friend_id?: string } | null;
					const oldRecord = payload.old as { user_id?: string; friend_id?: string } | null;
					const record = newRecord || oldRecord;

					if (
						record &&
						(record.user_id === this.userId || record.friend_id === this.userId)
					) {
						this.callbacks.onFriendshipChange?.();
					}
				}
			)
			.subscribe((status, err) => {
				if (err) {
					console.error('Friends subscription error:', err);
				}
			});

		this.channels.push(channel);
	}

	/**
	 * Subscribe to profiles table changes for status updates
	 * We need to listen to all friend profiles, but we'll filter client-side
	 * by only refreshing when a friend's status changes
	 */
	private subscribeToProfiles(): void {
		const channel = this.supabase
			.channel(`profiles_${this.userId}`, {
				config: {
					broadcast: { self: true }
				}
			})
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'profiles'
				},
				() => {
					// Only trigger if this is a friend's status update
					// We'll let the refresh logic handle checking if it's a friend
					// This is more efficient than subscribing to all individual friend profiles
					this.callbacks.onStatusChange?.();
				}
			)
			.subscribe((status, err) => {
				if (err) {
					console.error('Profiles subscription error:', err);
				}
			});

		this.channels.push(channel);
	}

	/**
	 * Unsubscribe from all real-time channels
	 */
	unsubscribe(): void {
		for (const channel of this.channels) {
			this.supabase.removeChannel(channel);
		}
		this.channels = [];
		this.callbacks = {};
	}
}

