import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	// Sign out from Supabase
	if (locals.supabase) {
		await locals.supabase.auth.signOut();
	}

	// Clear all auth-related cookies manually as an extra safety measure
	const authCookieNames = [
		'sb-access-token',
		'sb-refresh-token',
		'supabase-auth-token',
		'supabase.auth.token'
	];

	// Get all cookies and clear any that might be auth-related
	const allCookies = cookies.getAll();
	allCookies.forEach((cookie) => {
		// Clear any Supabase auth cookies
		if (cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
			cookies.delete(cookie.name, { path: '/' });
		}
	});

	// Also clear the known auth cookie names with different path configurations
	authCookieNames.forEach((name) => {
		cookies.delete(name, { path: '/' });
		cookies.delete(name, { path: '/', domain: undefined });
	});

	// Redirect to auth page
	throw redirect(303, '/auth');
};
