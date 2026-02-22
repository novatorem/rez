import { fail, redirect } from '@sveltejs/kit';

import type { Actions } from './$types';

export const actions: Actions = {
	signup: async ({ request, locals: { supabase }, url }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: `${url.origin}/auth/confirm`
			}
		});

		if (error) {
			return fail(400, {
				error: error.message,
				errorCode: error.status?.toString() || 'unknown',
				email
			});
		}

		// Check if email confirmation is required
		// Supabase may return a user but no session if email confirmation is required
		if (data.user && !data.session) {
			// Email confirmation required — return a plain object so result.type === 'success'
			// Using fail() here would set result.type === 'failure' and break the client handler
			return {
				requiresConfirmation: true,
				message: 'Please check your email to confirm your account before signing in.',
				email
			};
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
			return fail(401, {
				error: error.message,
				errorCode: error.status?.toString() || 'unknown',
				email
			});
		}

		redirect(303, '/dashboard');
	}
};
