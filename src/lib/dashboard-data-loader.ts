import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../app.d.ts';

// Types for the dashboard data
export interface FriendRequest {
	id: string;
	requester_id: string;
	requester_username: string;
	requester_display_name: string | null;
}

// Types for joined queries
interface FriendRequestWithUser {
	id: string;
	requester_id: string;
	users: {
		username: string;
		display_name: string | null;
	};
}

interface SentFriendRequestWithUser {
	id: string;
	target_id: string;
	users: {
		username: string;
		display_name: string | null;
	};
	status: string;
	created_at: string;
}

interface FriendWithUser {
	id: string;
	user_id: string;
	friend_id: string;
	users: {
		id: string;
		username: string;
		display_name: string | null;
	};
}

export interface SentFriendRequest {
	id: string;
	target_id: string;
	target_username: string;
	target_display_name: string | null;
	status: string;
	created_at: string;
}

export interface Friend {
	id: string;
	username: string;
	display_name: string | null;
	status: string | null;
	status_updated_at: string | null;
}

export interface DashboardData {
	currentUsername: string;
	currentDisplayName: string | null;
	currentStatus: string;
	friendRequests: FriendRequest[];
	sentFriendRequests: SentFriendRequest[];
	friends: Friend[];
}

export interface UserExportData {
	user: {
		id: string;
		email: string;
		username: string;
		display_name: string | null;
		created_at: string;
		updated_at: string;
	};
	profile: {
		status: string;
		created_at: string;
		updated_at: string;
	};
	friends: Friend[];
	friendRequests: FriendRequest[];
	sentFriendRequests: SentFriendRequest[];
	exportMetadata: {
		exportedAt: string;
		version: string;
	};
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

	async loadUserProfile(): Promise<{
		username: string;
		display_name: string | null;
		status: string;
	}> {
		const [userData, profileData] = await Promise.all([
			this.supabase.from('users').select('username, display_name').eq('id', this.userId).single(),
			this.supabase.from('profiles').select('status').eq('id', this.userId).single()
		]);

		return {
			username: userData.data?.username || '',
			display_name: userData.data?.display_name || null,
			status: profileData.data?.status || ''
		};
	}

	async loadFriendRequests(): Promise<FriendRequest[]> {
		const { data } = await this.supabase
			.from('friend_requests')
			.select('id, requester_id, users!requester_id(username, display_name)')
			.eq('target_id', this.userId)
			.eq('status', 'pending');

		const formattedRequests =
			data?.map((request) => {
				const requestWithUser = request as FriendRequestWithUser;
				return {
					id: requestWithUser.id,
					requester_id: requestWithUser.requester_id,
					requester_username: requestWithUser.users?.username || 'Unknown user',
					requester_display_name: requestWithUser.users?.display_name || null
				};
			}) || [];

		return deduplicateById(formattedRequests);
	}

	async loadSentFriendRequests(): Promise<SentFriendRequest[]> {
		const { data } = await this.supabase
			.from('friend_requests')
			.select('id, target_id, users!target_id(username, display_name), status, created_at')
			.eq('requester_id', this.userId)
			.eq('status', 'pending');

		const formattedSentRequests =
			data?.map((request) => {
				const requestWithUser = request as SentFriendRequestWithUser;
				return {
					id: requestWithUser.id,
					target_id: requestWithUser.target_id,
					target_username: requestWithUser.users?.username || 'Unknown user',
					target_display_name: requestWithUser.users?.display_name || null,
					status: requestWithUser.status,
					created_at: requestWithUser.created_at
				};
			}) || [];

		return deduplicateById(formattedSentRequests);
	}

	async loadFriends(): Promise<Friend[]> {
		// Get friends where current user is the user_id and where current user is the friend_id
		const [friendsAsUser, friendsAsFriend] = await Promise.all([
			this.supabase
				.from('friends')
				.select('id, user_id, friend_id, users!friend_id(id, username, display_name)')
				.eq('user_id', this.userId),
			this.supabase
				.from('friends')
				.select('id, user_id, friend_id, users!user_id(id, username, display_name)')
				.eq('friend_id', this.userId)
		]);

		// Combine both directions of friendships
		const friends = [...(friendsAsUser.data || []), ...(friendsAsFriend.data || [])];

		// Get friend IDs to fetch their statuses
		const friendIds = friends.map((friend) => {
			const friendWithUser = friend as FriendWithUser;
			return friendWithUser.users.id;
		});

		// Get statuses for all friends in parallel
		const { data: friendStatuses } =
			friendIds.length > 0
				? await this.supabase.from('profiles').select('id, status, updated_at').in('id', friendIds)
				: { data: [] };

		// Create maps for friend statuses and status updated times for easy lookup
		const statusMap = new Map(friendStatuses?.map((profile) => [profile.id, profile.status]) || []);
		const statusUpdatedAtMap = new Map(
			friendStatuses?.map((profile) => [profile.id, profile.updated_at]) || []
		);

		// Process and format friends
		const formattedFriends = friends.map((friend) => {
			const friendWithUser = friend as FriendWithUser;
			return {
				id: friendWithUser.users.id,
				username: friendWithUser.users.username,
				display_name: friendWithUser.users.display_name,
				status: statusMap.get(friendWithUser.users.id) || null,
				status_updated_at: statusUpdatedAtMap.get(friendWithUser.users.id) || null
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
			currentDisplayName: userProfile.display_name,
			currentStatus: userProfile.status,
			friendRequests,
			sentFriendRequests,
			friends
		};
	}

	async exportUserData(): Promise<UserExportData> {
		// Load all user data including detailed user and profile information
		const [userData, profileData, friendRequests, sentFriendRequests, friends] = await Promise.all([
			this.supabase
				.from('users')
				.select('id, email, username, display_name, created_at, updated_at')
				.eq('id', this.userId)
				.single(),
			this.supabase
				.from('profiles')
				.select('status, created_at, updated_at')
				.eq('id', this.userId)
				.single(),
			this.loadFriendRequests(),
			this.loadSentFriendRequests(),
			this.loadFriends()
		]);

		if (!userData.data) {
			throw new Error('User data not found');
		}

		return {
			user: {
				id: userData.data.id,
				email: userData.data.email || '',
				username: userData.data.username,
				display_name: userData.data.display_name,
				created_at: userData.data.created_at,
				updated_at: userData.data.updated_at
			},
			profile: {
				status: profileData.data?.status || '',
				created_at: profileData.data?.created_at || '',
				updated_at: profileData.data?.updated_at || ''
			},
			friends,
			friendRequests,
			sentFriendRequests,
			exportMetadata: {
				exportedAt: new Date().toISOString(),
				version: '1.0'
			}
		};
	}

	async deleteUserAccount(): Promise<void> {
		// Use the database function to delete the user account
		// This function handles all the deletion logic and can delete the auth user
		try {
			const { error } = await this.supabase.rpc(
				'delete_user_account' as keyof Database['public']['Functions']
			);

			if (error) {
				console.error('Error deleting user account:', error);
				console.error('Full error details:', {
					message: error.message,
					details: error.details,
					hint: error.hint,
					code: error.code
				});
				throw new Error(
					`Failed to delete account: ${error.message}${error.details ? ` (${error.details})` : ''}${error.hint ? ` Hint: ${error.hint}` : ''}`
				);
			}

			console.log('User account deleted successfully');
		} catch (error) {
			console.error('Account deletion failed:', error);
			// Re-throw the error with enhanced information if it's a Supabase error
			if (error instanceof Error) {
				throw error;
			} else {
				throw new Error(`Account deletion failed: ${String(error)}`);
			}
		}
	}
}
