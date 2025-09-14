import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ depends, locals: { safeGetSession } }) => {
	// Set up dependencies for client-side data loading
	depends('supabase:auth');

	const { session } = await safeGetSession();

	if (!session) {
		throw new Error('User not authenticated');
	}

	// Only return essential auth data - let client load the rest
	return {
		session
	};
};
