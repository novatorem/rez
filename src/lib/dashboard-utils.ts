import { invalidate } from '$app/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toastStore } from './toast-store.js';

// Constants
export const MAX_STATUS_LENGTH = 42;
export const MAX_USERNAME_LENGTH = 20;
export const MAX_DISPLAY_NAME_LENGTH = 50;
export const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]*$/;

// Error messages
export const ERROR_MESSAGES = {
	DATABASE_UNAVAILABLE: 'Database connection not available',
	UNAUTHORIZED: 'You must be logged in to perform this action',
	STATUS_TOO_LONG: `Status must be ${MAX_STATUS_LENGTH} characters or less`,
	USERNAME_EMPTY: 'Username cannot be empty',
	USERNAME_TOO_LONG: `Username must be ${MAX_USERNAME_LENGTH} characters or less`,
	USERNAME_INVALID:
		'Username must start with a letter and can only contain letters, numbers, dots, dashes, and underscores',
	USERNAME_TAKEN: 'Username is already taken',
	DISPLAY_NAME_TOO_LONG: `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less`,
	DISPLAY_NAME_EMPTY: 'Display name cannot be empty',
	USER_NOT_FOUND: 'User not found',
	CANNOT_FRIEND_SELF: "You can't send a friend request to yourself",
	ALREADY_FRIENDS: 'You are already friends with this user',
	REQUEST_ALREADY_SENT: 'Friend request already sent and is pending',
	INCOMING_REQUEST_EXISTS:
		'This user has already sent you a friend request. Check your pending requests!',
	FRIENDSHIP_VERIFICATION_FAILED: 'Unable to verify friendship status'
} as const;

// Notification system using DaisyUI toast components
export class NotificationManager {
	static show(message: string, type: 'success' | 'error' | 'info' = 'info') {
		// Use the toast store to display notifications
		toastStore.add(message, type);

		// Keep console logging for errors for debugging
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

// Database error handler
export function handleDatabaseError(error: unknown, operation: string): boolean {
	console.error(`Database error during ${operation}:`, error);
	NotificationManager.showError(`Failed to ${operation}`);
	return false;
}

// Validation utilities
export function validateStatus(status: string): string | null {
	if (status.length > MAX_STATUS_LENGTH) {
		return ERROR_MESSAGES.STATUS_TOO_LONG;
	}
	return null;
}

export function validateUsername(username: string): string | null {
	if (username.length === 0) {
		return ERROR_MESSAGES.USERNAME_EMPTY;
	}
	if (username.length > MAX_USERNAME_LENGTH) {
		return ERROR_MESSAGES.USERNAME_TOO_LONG;
	}
	if (!USERNAME_PATTERN.test(username)) {
		return ERROR_MESSAGES.USERNAME_INVALID;
	}
	return null;
}

export function validateDisplayName(displayName: string): string | null {
	if (displayName.length === 0) {
		return ERROR_MESSAGES.DISPLAY_NAME_EMPTY;
	}
	if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
		return ERROR_MESSAGES.DISPLAY_NAME_TOO_LONG;
	}
	return null;
}

// Display name utilities
export function getDisplayName(displayName: string | null, username: string): string {
	return displayName || username;
}

export function sanitizeDisplayName(displayName: string): string {
	// Trim whitespace from display name
	return displayName.trim();
}

// Authentication guards
export function requireAuth(user: { id: string } | null, supabase: SupabaseClient | null): boolean {
	if (!user) {
		NotificationManager.showError(ERROR_MESSAGES.UNAUTHORIZED);
		return false;
	}
	if (!supabase) {
		NotificationManager.showError(ERROR_MESSAGES.DATABASE_UNAVAILABLE);
		return false;
	}
	return true;
}

// Cache invalidation utility
export async function invalidateRelatedCaches(): Promise<void> {
	await Promise.all([
		invalidate('supabase:db:friend_requests'),
		invalidate('supabase:db:friends'),
		invalidate('supabase:db:users'),
		invalidate('supabase:db:profiles')
	]);
}

// Friendship verification utility
export async function verifyFriendshipExists(
	supabase: SupabaseClient,
	userId: string,
	friendId: string
): Promise<boolean> {
	try {
		// Check both directions of the friendship
		const [friendship1, friendship2] = await Promise.all([
			supabase
				.from('friends')
				.select('id')
				.eq('user_id', userId)
				.eq('friend_id', friendId)
				.maybeSingle(), // Use maybeSingle() to avoid throwing on no results
			supabase
				.from('friends')
				.select('id')
				.eq('user_id', friendId)
				.eq('friend_id', userId)
				.maybeSingle() // Use maybeSingle() to avoid throwing on no results
		]);

		// Check if either query had an error or if either friendship exists
		const hasError = friendship1.error || friendship2.error;
		const friendshipExists = !!(friendship1.data || friendship2.data);

		if (hasError) {
			console.error('Error verifying friendship:', friendship1.error || friendship2.error);
			return false;
		}

		return friendshipExists;
	} catch (error) {
		console.error('Error verifying friendship:', error);
		return false;
	}
}

// Friend request utilities
export async function checkExistingFriendRequest(
	supabase: SupabaseClient,
	requesterId: string,
	targetId: string
): Promise<{ exists: boolean; request?: { id: string; status: string } }> {
	try {
		const { data: existingRequest, error } = await supabase
			.from('friend_requests')
			.select('id, status')
			.eq('requester_id', requesterId)
			.eq('target_id', targetId)
			.maybeSingle();

		if (error && error.code !== 'PGRST116') {
			throw error;
		}

		return {
			exists: !!existingRequest,
			request: existingRequest || undefined
		};
	} catch (error) {
		console.error('Error checking existing friend request:', error);
		throw error;
	}
}

export async function checkIncomingFriendRequest(
	supabase: SupabaseClient,
	requesterId: string,
	targetId: string
): Promise<{ exists: boolean; isPending: boolean }> {
	try {
		const { data: incomingRequest, error } = await supabase
			.from('friend_requests')
			.select('id, status')
			.eq('requester_id', targetId)
			.eq('target_id', requesterId)
			.maybeSingle();

		if (error && error.code !== 'PGRST116') {
			throw error;
		}

		return {
			exists: !!incomingRequest,
			isPending: incomingRequest?.status === 'pending'
		};
	} catch (error) {
		console.error('Error checking incoming friend request:', error);
		throw error;
	}
}

// Username utilities
export function sanitizeUsername(username: string): string {
	// Trim whitespace from username
	return username.trim();
}

export async function findUserByUsername(
	supabase: SupabaseClient,
	username: string
): Promise<{ id: string } | null> {
	try {
		const { data: user, error } = await supabase
			.from('users')
			.select('id')
			.eq('username', username)
			.single();

		if (error && error.code !== 'PGRST116') {
			throw error;
		}

		return user;
	} catch (error) {
		console.error('Error finding user:', error);
		throw error;
	}
}

export async function checkUsernameAvailability(
	supabase: SupabaseClient,
	username: string,
	currentUserId: string
): Promise<boolean> {
	try {
		const { data: existingUser, error } = await supabase
			.from('users')
			.select('id')
			.eq('username', username)
			.neq('id', currentUserId)
			.single();

		if (error && error.code !== 'PGRST116') {
			throw error;
		}

		return !existingUser; // Available if no existing user found
	} catch (error) {
		console.error('Error checking username availability:', error);
		throw error;
	}
}
