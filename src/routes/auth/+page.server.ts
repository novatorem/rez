import { fail, redirect } from '@sveltejs/kit';

import type { Actions } from './$types';

export const actions: Actions = {
	signup: async ({ request, locals: { supabase }, url }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		// Get user agent for debugging iOS issues
		const userAgent = request.headers.get('user-agent') || '';
		const isIOS = /iPad|iPhone|iPod/.test(userAgent);

		// Enhanced signup with better error handling
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				// Ensure email redirect is set properly for iOS
				emailRedirectTo: `${url.origin}/auth/confirm`
			}
		});

		if (error) {
			// Log detailed error information
			const errorDetails = {
				message: error.message,
				status: error.status,
				name: error.name,
				isIOS,
				userAgent: isIOS ? userAgent : undefined // Only log user agent for iOS
			};

			console.error('Signup error:', JSON.stringify(errorDetails, null, 2));

			// Return error with details for display
			return fail(400, {
				error: error.message,
				errorCode: error.status?.toString() || 'unknown',
				errorName: error.name,
				isIOS,
				email
			});
		}

		// Check if email confirmation is required
		// Supabase may return a user but no session if email confirmation is required
		if (data.user && !data.session) {
			// Email confirmation required
			return fail(200, {
				success: true,
				requiresConfirmation: true,
				message: 'Please check your email to confirm your account before signing in.',
				email
			});
		}

		// Signup successful with session
		if (data.session) {
			redirect(303, '/dashboard');
		} else {
			// Edge case: no error but also no session/user
			return fail(500, {
				error: 'Signup completed but no session was created. Please try logging in.',
				email
			});
		}
	},
	login: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		const { error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) {
			console.error('Supabase signInWithPassword error details:', JSON.stringify(error, null, 2));
			return fail(401, {
				error: error.message,
				errorCode: error.status?.toString() || 'unknown',
				email
			});
		} else {
			console.log('Login successful according to Supabase');
			redirect(303, '/dashboard');
		}
	}
};
