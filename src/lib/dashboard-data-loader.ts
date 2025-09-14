import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../app.d.ts';

// Types for the dashboard data
export interface FriendRequest {
	id: string;
	requester_id: string;
	requester_username: string;
}

export interface SentFriendRequest {
	id: string;
	target_id: string;
	target_username: string;
	status: string;
	created_at: string;
}

export interface Friend {
	id: string;
	username: string;
	status: string | null;
}

export interface DashboardData {
	currentUsername: string;
	currentStatus: string;
	friendRequests: FriendRequest[];
	sentFriendRequests: SentFriendRequest[];
	friends: Friend[];
}

// Utility function to remove duplicates by ID
const deduplicateById = <T extends { id: string }>(items: T[]): T[] =>
	items.filter((item, index, self) => index === self.findIndex((other) => other.id === item.id));

export class DashboardDataLoader {
	private supabase: SupabaseClient<Database>;
	private userId: string;

	constructor(supabase: SupabaseClient<Database>, userId: string) {
		this.supabase = supabase;
		this.userId = userId;
	}

	async loadUserProfile(): Promise<{ username: string; status: string }> {
		const [userData, profileData] = await Promise.all([
			this.supabase.from('users').select('username').eq('id', this.userId).single(),
			this.supabase.from('profiles').select('status').eq('id', this.userId).single()
		]);

		return {
			username: userData.data?.username || '',
			status: profileData.data?.status || ''
		};
	}

	async loadFriendRequests(): Promise<FriendRequest[]> {
		const { data } = await this.supabase
			.from('friend_requests')
			.select('id, requester_id, requester:requester_id(username)')
			.eq('target_id', this.userId)
			.eq('status', 'pending');

		const formattedRequests =
			data?.map((request) => ({
				id: request.id,
				requester_id: request.requester_id,
				requester_username: request.requester?.username || 'Unknown user'
			})) || [];

		return deduplicateById(formattedRequests);
	}

	async loadSentFriendRequests(): Promise<SentFriendRequest[]> {
		const { data } = await this.supabase
			.from('friend_requests')
			.select('id, target_id, target:target_id(username), status, created_at')
			.eq('requester_id', this.userId)
			.eq('status', 'pending');

		const formattedSentRequests =
			data?.map((request) => ({
				id: request.id,
				target_id: request.target_id,
				target_username: request.target?.username || 'Unknown user',
				status: request.status,
				created_at: request.created_at
			})) || [];

		return deduplicateById(formattedSentRequests);
	}

	async loadFriends(): Promise<Friend[]> {
		// Get friends where current user is the user_id and where current user is the friend_id
		const [friendsAsUser, friendsAsFriend] = await Promise.all([
			this.supabase
				.from('friends')
				.select('id, user_id, friend_id, friend:friend_id(id, username)')
				.eq('user_id', this.userId),
			this.supabase
				.from('friends')
				.select('id, user_id, friend_id, user:user_id(id, username)')
				.eq('friend_id', this.userId)
		]);

		// Combine both directions of friendships
		const friends = [...(friendsAsUser.data || []), ...(friendsAsFriend.data || [])];

		// Get friend IDs to fetch their statuses
		const friendIds = friends.map((friend) => {
			const friendUser = friend.user_id === this.userId ? friend.friend : friend.user;
			return friendUser.id;
		});

		// Get statuses for all friends in parallel
		const { data: friendStatuses } =
			friendIds.length > 0
				? await this.supabase.from('profiles').select('id, status').in('id', friendIds)
				: { data: [] };

		// Create a map of friend statuses for easy lookup
		const statusMap = new Map(friendStatuses?.map((profile) => [profile.id, profile.status]) || []);

		// Process and format friends
		const formattedFriends = friends.map((friend) => {
			const friendUser = friend.user_id === this.userId ? friend.friend : friend.user;
			return {
				id: friendUser.id,
				username: friendUser.username,
				status: statusMap.get(friendUser.id) || null
			};
		});

		return deduplicateById(formattedFriends);
	}

	async loadAllData(): Promise<DashboardData> {
		// Load all data in parallel for better performance
		const [userProfile, friendRequests, sentFriendRequests, friends] = await Promise.all([
			this.loadUserProfile(),
			this.loadFriendRequests(),
			this.loadSentFriendRequests(),
			this.loadFriends()
		]);

		return {
			currentUsername: userProfile.username,
			currentStatus: userProfile.status,
			friendRequests,
			sentFriendRequests,
			friends
		};
	}
}
