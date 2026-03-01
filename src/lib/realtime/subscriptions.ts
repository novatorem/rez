import type { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../database.types';

export interface StatusChangePayload {
	id: string;
	status: string | null;
	updated_at: string;
}

interface SubscriptionCallbacks {
	onFriendRequestChange?: () => void;
	onFriendshipChange?: () => void;
	onStatusChange?: (payload: StatusChangePayload) => void;
}

// Realtime only supports a single eq filter per channel, so each table needs two channels.
export class RealtimeSubscriptionManager {
	private supabase: SupabaseClient<Database>;
	private userId: string;
	private channels: RealtimeChannel[] = [];
	private profileChannel: RealtimeChannel | null = null;
	private callbacks: SubscriptionCallbacks = {};
	private subscribedFriendIds: string[] = [];

	constructor(supabase: SupabaseClient<Database>, userId: string) {
		this.supabase = supabase;
		this.userId = userId;
	}

	subscribe(callbacks: SubscriptionCallbacks): void {
		this.callbacks = callbacks;
		this.subscribeToFriendRequests();
		this.subscribeToFriends();
	}

	updateFriendIds(friendIds: string[]): void {
		const sorted = [...friendIds].sort();

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

	private subscribeToFriendRequests(): void {
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

	private subscribeToFriends(): void {
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
				(payload: RealtimePostgresChangesPayload<{ id: string; status: string | null; updated_at: string }>) => {
					const row = payload.new as { id: string; status: string | null; updated_at: string } | undefined;
					if (row?.id) {
						this.callbacks.onStatusChange?.({
							id: row.id,
							status: row.status,
							updated_at: row.updated_at
						});
					}
				}
			)
			.subscribe((_, err) => {
				if (err) console.error('Realtime: profiles error:', err);
			});
	}

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
