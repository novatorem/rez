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
	created_at: string;
}

export interface SentFriendRequest {
	id: string;
	target_id: string;
	target_username: string;
	target_display_name: string | null;
	created_at: string;
}

export interface Friend {
	id: string;
	username: string;
	display_name: string | null;
	status: string | null;
	status_updated_at: string | null;
}

export interface QuickStatus {
	id: string;
	status_text: string;
	display_order: number;
}

export interface DashboardData {
	currentUsername: string;
	currentDisplayName: string | null;
	currentStatus: string;
	friendRequests: FriendRequest[];
	sentFriendRequests: SentFriendRequest[];
	friends: Friend[];
	quickStatuses: QuickStatus[];
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
	quickStatuses: QuickStatus[];
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
			.eq('target_id', this.userId);

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
			.select('id, target_id, users!target_id(username, display_name), created_at')
			.eq('requester_id', this.userId);

		const formattedSentRequests =
			data?.map((request) => {
				const requestWithUser = request as SentFriendRequestWithUser;
				return {
					id: requestWithUser.id,
					target_id: requestWithUser.target_id,
					target_username: requestWithUser.users?.username || 'Unknown user',
					target_display_name: requestWithUser.users?.display_name || null,
					created_at: requestWithUser.created_at
				};
			}) || [];

		return deduplicateById(formattedSentRequests);
	}

	async loadFriends(): Promise<Friend[]> {
		// Get all friendships where current user is either user_id or friend_id
		// Since we now store only one record per friendship, we need to check both columns
		const { data: friendships } = await this.supabase
			.from('friends')
			.select('id, user_id, friend_id')
			.or(`user_id.eq.${this.userId},friend_id.eq.${this.userId}`);

		if (!friendships || friendships.length === 0) {
			return [];
		}

		// Get friend IDs (the other person in each friendship)
		const friendIds = friendships.map((friendship) => {
			return friendship.user_id === this.userId ? friendship.friend_id : friendship.user_id;
		});

		// Fetch user details for all friends
		const { data: friendUsers } = await this.supabase
			.from('users')
			.select('id, username, display_name')
			.in('id', friendIds);

		// Get statuses for all friends in parallel
		const { data: friendStatuses } =
			friendIds.length > 0
				? await this.supabase.from('profiles').select('id, status, updated_at').in('id', friendIds)
				: { data: [] };

		// Create maps for friend data
		const userMap = new Map(friendUsers?.map((user) => [user.id, user]) || []);
		const statusMap = new Map(friendStatuses?.map((profile) => [profile.id, profile.status]) || []);
		const statusUpdatedAtMap = new Map(
			friendStatuses?.map((profile) => [profile.id, profile.updated_at]) || []
		);

		// Process and format friends
		const formattedFriends = friendIds.map((friendId) => {
			const user = userMap.get(friendId);
			return {
				id: friendId,
				username: user?.username || 'Unknown',
				display_name: user?.display_name || null,
				status: statusMap.get(friendId) || null,
				status_updated_at: statusUpdatedAtMap.get(friendId) || null
			};
		});

		return deduplicateById(formattedFriends);
	}

	async loadQuickStatuses(): Promise<QuickStatus[]> {
		const { data } = await this.supabase
			.from('quick_statuses')
			.select('id, status_text, display_order')
			.eq('user_id', this.userId)
			.order('display_order', { ascending: true });

		return (
			data?.map((qs) => ({
				id: qs.id,
				status_text: qs.status_text,
				display_order: qs.display_order
			})) || []
		);
	}

	async loadAllData(): Promise<DashboardData> {
		// Load all data in parallel for better performance
		const [userProfile, friendRequests, sentFriendRequests, friends, quickStatuses] =
			await Promise.all([
				this.loadUserProfile(),
				this.loadFriendRequests(),
				this.loadSentFriendRequests(),
				this.loadFriends(),
				this.loadQuickStatuses()
			]);

		return {
			currentUsername: userProfile.username,
			currentDisplayName: userProfile.display_name,
			currentStatus: userProfile.status,
			friendRequests,
			sentFriendRequests,
			friends,
			quickStatuses
		};
	}

	async exportUserData(): Promise<UserExportData> {
		// Load all user data including detailed user and profile information
		const [userData, profileData, friendRequests, sentFriendRequests, friends, quickStatuses] =
			await Promise.all([
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
				this.loadFriends(),
				this.loadQuickStatuses()
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
			quickStatuses,
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
