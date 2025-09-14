// Set NODE_TLS_REJECT_UNAUTHORIZED=0 only in development mode
// This allows self-signed certificates to be accepted
if (process.env.NODE_ENV === 'development') {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
	console.log('⚠️\tSSL certificate verification disabled for development');
}

import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { themes } from '$lib/themes';
import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import https from 'node:https';

// Create a custom agent that allows self-signed certificates in development
const isDev = process.env.NODE_ENV === 'development';
const httpsAgent = isDev ? new https.Agent({ rejectUnauthorized: false }) : undefined;

// Custom fetch function that uses our HTTPS agent in development
const customFetch = (input: URL | RequestInfo, init?: RequestInit) => {
	if (isDev) {
		// In development, use node-fetch with our custom agent
		return fetch(input, {
			...init,
			// @ts-expect-error - Agent is not in standard RequestInit but works with Node.js fetch
			agent: httpsAgent
		});
	}
	// In production, use the standard fetch
	return fetch(input, init);
};

const supabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (
				cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
			) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		},
		global: {
			fetch: customFetch
		}
	});

	event.locals.safeGetSession = async () => {
		try {
			const {
				data: { session },
				error: sessionError
			} = await event.locals.supabase.auth.getSession();

			// If there's a session error, especially refresh token errors, clear and return null
			if (sessionError) {
				// Only log non-refresh-token errors to avoid spam in development
				if (
					sessionError.message &&
					!sessionError.message.includes('refresh_token_not_found') &&
					!sessionError.message.includes('Invalid Refresh Token')
				) {
					console.error('Session error:', sessionError);
				}

				// Clear invalid tokens by signing out silently
				await event.locals.supabase.auth.signOut({ scope: 'local' });
				return { session: null, user: null };
			}

			if (!session) {
				return { session: null, user: null };
			}

			const {
				data: { user },
				error: userError
			} = await event.locals.supabase.auth.getUser();

			if (userError) {
				// Only log non-refresh-token errors
				if (
					userError.message &&
					!userError.message.includes('refresh_token_not_found') &&
					!userError.message.includes('Invalid Refresh Token')
				) {
					console.error('Error getting user:', userError);
				}

				// Clear invalid tokens and return null
				await event.locals.supabase.auth.signOut({ scope: 'local' });
				return { session: null, user: null };
			}

			return { session, user };
		} catch (err: unknown) {
			// Only log unexpected errors, not auth-related ones
			const authError = err as { __isAuthError?: boolean; code?: string; message?: string };
			if (
				authError.__isAuthError &&
				(authError.code === 'refresh_token_not_found' ||
					authError.message?.includes('Invalid Refresh Token'))
			) {
				// Silently handle refresh token errors - clear and return null
				try {
					await event.locals.supabase.auth.signOut({ scope: 'local' });
				} catch {
					// Ignore errors when clearing tokens
				}
				return { session: null, user: null };
			}

			console.error('Unexpected session error:', err);
			return { session: null, user: null };
		}
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	if (!event.locals.session && event.url.pathname.startsWith('/dashboard')) {
		redirect(303, '/auth');
	}

	if (event.locals.session && event.url.pathname === '/auth') {
		redirect(303, '/dashboard');
	}

	return resolve(event);
};

// Handle Chrome DevTools requests to prevent 404 errors
const handleDevToolsRequests: Handle = async ({ event, resolve }) => {
	// Check if the request is for Chrome DevTools specific endpoints
	if (event.url.pathname.includes('/.well-known/appspecific/com.chrome.devtools')) {
		return new Response(JSON.stringify({ message: 'Not implemented' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return resolve(event);
};

const themeHandler: Handle = async ({ event, resolve }) => {
	const theme = event.cookies.get('theme');

	const isValidTheme = theme && themes.includes(theme);

	const transformOptions = isValidTheme
		? {
				transformPageChunk: ({ html }: { html: string }) => {
					return html.replace(
						/<html(.*?)data-theme=(["'])(.*?)(\2)(.*?)>/,
						`<html$1data-theme="${theme}"$5>`
					);
				}
			}
		: {};

	return resolve(event, transformOptions);
};

export const handle: Handle = sequence(supabase, authGuard, handleDevToolsRequests, themeHandler);
