import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import type { LayoutLoad } from './$types';

// Type guard for auth errors
function isAuthError(
	err: unknown
): err is { __isAuthError: boolean; code?: string; message?: string } {
	return (
		err !== null &&
		typeof err === 'object' &&
		'__isAuthError' in err &&
		typeof (err as Record<string, unknown>).__isAuthError === 'boolean'
	);
}

// Custom fetch function for browser client
const customBrowserFetch = (url: RequestInfo | URL, init?: RequestInit) => {
	return fetch(url, {
		...init
		// In browser context, we don't need to modify fetch options,
		// but we could add custom headers or other configuration here if needed
	});
};

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	/**
	 * Declare a dependency so the layout can be invalidated, for example, on
	 * session refresh.
	 */
	depends('supabase:auth');

	try {
		const supabase = isBrowser()
			? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
					global: {
						fetch: customBrowserFetch
					}
				})
			: createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
					global: {
						fetch
					},
					cookies: {
						getAll() {
							return data.cookies;
						}
					}
				});

		/**
		 * It's fine to use `getSession` here, because on the client, `getSession` is
		 * safe, and on the server, it reads `session` from the `LayoutData`, which
		 * safely checked the session using `safeGetSession`.
		 */
		const {
			data: { session },
			error: sessionError
		} = await supabase.auth.getSession();

		// Handle refresh token errors gracefully
		if (sessionError && sessionError.message?.includes('refresh_token_not_found')) {
			// Clear invalid tokens silently
			if (isBrowser()) {
				await supabase.auth.signOut({ scope: 'local' });
			}
			return { session: null, supabase, user: null };
		}

		let user = null;
		if (session) {
			try {
				const {
					data: { user: fetchedUser },
					error: userError
				} = await supabase.auth.getUser();

				if (userError && userError.message?.includes('refresh_token_not_found')) {
					// Clear invalid tokens silently
					if (isBrowser()) {
						await supabase.auth.signOut({ scope: 'local' });
					}
					return { session: null, supabase, user: null };
				}

				user = fetchedUser;
			} catch (err: unknown) {
				// Handle auth errors silently
				if (isAuthError(err) && err.code === 'refresh_token_not_found') {
					if (isBrowser()) {
						await supabase.auth.signOut({ scope: 'local' });
					}
					return { session: null, supabase, user: null };
				}
				throw err; // Re-throw unexpected errors
			}
		}

		return { session, supabase, user };
	} catch (err: unknown) {
		// Handle auth errors gracefully
		if (
			isAuthError(err) &&
			(err.code === 'refresh_token_not_found' ||
				(err.message && err.message.includes('Invalid Refresh Token')))
		) {
			return { session: null, supabase: null, user: null };
		}

		console.error('Error in layout load:', err);
		return { session: null, supabase: null, user: null };
	}
};
