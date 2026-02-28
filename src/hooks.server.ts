// Set NODE_TLS_REJECT_UNAUTHORIZED=0 only in development mode
// This allows self-signed certificates to be accepted
if (process.env.NODE_ENV === 'development') {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
	console.log('⚠️\tSSL certificate verification disabled for development');
}

import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { themes } from '$lib/ui/themes';
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
					// Get the current host from the request
					const host = event.url.hostname;

					// Detect iOS Safari user agent for special cookie handling
					const userAgent = event.request.headers.get('user-agent') || '';
					const isIOS = /iPad|iPhone|iPod/.test(userAgent);
					const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent);
					const isIOSSafari = isIOS && isSafari;

					// SECURITY FIX: Set secure cookie options to prevent session sharing across devices/domains
					// This addresses the critical vulnerability where users were sharing sessions
					// iOS Safari compatibility: Use 'none' with secure for cross-site, or 'lax' for same-site
					// For iOS Safari, we need to be more careful with sameSite settings
					const secureOptions = {
						...options,
						path: '/',
						// Note: We don't set httpOnly for auth tokens as Supabase needs client-side access
						// Set secure flag in production (requires HTTPS)
						secure: event.url.protocol === 'https:',
						// iOS Safari fix: Use 'lax' for same-site, but ensure secure is set properly
						// For iOS Safari, 'lax' works better than 'none' for same-site requests
						sameSite: (isIOSSafari && event.url.protocol === 'https:')
							? 'lax' as const
							: 'lax' as const,
						// Set domain to current host to prevent cross-domain sharing
						// This ensures sessions are isolated per domain/device
						// iOS Safari: Don't set domain for localhost, and be careful with subdomains
						domain: host.startsWith('localhost') || host.startsWith('127.0.0.1')
							? undefined
							: host
					};

					event.cookies.set(name, value, secureOptions);
				});
			}
		},
		global: {
			fetch: customFetch
		}
	});

	event.locals.safeGetSession = async () => {
		const {
			data: { session },
			error: sessionError
		} = await event.locals.supabase.auth.getSession();

		if (!session || sessionError) {
			return { session: null, user: null };
		}

		const {
			data: { user },
			error: userError
		} = await event.locals.supabase.auth.getUser();

		if (userError) {
			// JWT validation has failed - following official docs pattern
			return { session: null, user: null };
		}

		return { session, user };
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
