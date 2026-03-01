import type { SupabaseClient } from '@supabase/supabase-js';

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

		return !existingUser;
	} catch (error) {
		console.error('Error checking username availability:', error);
		throw error;
	}
}
