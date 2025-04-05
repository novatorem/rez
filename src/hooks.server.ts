// src/hooks.server.ts
import { themes } from '$lib/themes'; // Assuming themes is defined here e.g., export const themes = ['light', 'dark'];

import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks'; // Import sequence

import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';

// 1. Supabase Setup Handle
const supabaseSetup: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      // Pass 'path: "/"' for Supabase cookies to be accessible across the entire application
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          event.cookies.set(name, value, { ...options, path: '/' });
        });
      },
    },
  });

  // Helper function to safely get session and user
  event.locals.safeGetSession = async () => {
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession();
    if (!session) {
      return { session: null, user: null };
    }

    // Check if JWT is valid (e.g., not expired, signature correct)
    const {
      data: { user },
      error,
    } = await event.locals.supabase.auth.getUser();
    if (error) {
      // JWT validation failed, treat as logged out
      // Optionally clear the invalid cookie
      // event.cookies.delete('sb-access-token', { path: '/' }); // Adjust cookie name if needed
      // event.cookies.delete('sb-refresh-token', { path: '/' }); // Adjust cookie name if needed
      return { session: null, user: null };
    }

    return { session, user };
  };

  // Resolve the request, filtering specific headers for Supabase
  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      // Necessary for Supabase Auth to work correctly
      return name === 'content-range' || name === 'x-supabase-api-version';
    },
  });
};

// 2. Auth Guard Handle
const authGuard: Handle = async ({ event, resolve }) => {
  // Get session and user using the helper function
  // This must run *after* supabaseSetup
  const { session, user } = await event.locals.safeGetSession();
  event.locals.session = session;
  event.locals.user = user;

  // Redirect authenticated users trying to access /auth
  if (event.locals.session && event.url.pathname.startsWith('/auth')) {
    redirect(303, '/private'); // Or '/' or '/dashboard' etc.
  }

  // Redirect unauthenticated users trying to access protected routes
  if (!event.locals.session && event.url.pathname.startsWith('/private')) {
    redirect(303, '/auth');
  }

  // Continue processing the request
  return resolve(event);
};

// 3. Theme Handler Handle
const themeHandler: Handle = async ({ event, resolve }) => {
  const theme = event.cookies.get('theme');

  // Ensure the theme from the cookie is valid
  const isValidTheme = theme && themes.includes(theme);

  // Prepare theme transformation options
  const transformOptions = isValidTheme
    ? {
        transformPageChunk: ({ html }: { html: string }) => {
          // Replace the placeholder or existing data-theme attribute
          // Using a regex allows for replacing existing value or adding it if missing/empty
          return html.replace(/<html(.*?)data-theme=(["'])(.*?)(\2)(.*?)>/, `<html$1data-theme="${theme}"$5>`);
          // A simpler replace might work if you *know* the attribute exists and is empty:
          // return html.replace('data-theme=""', `data-theme="${theme}"`);
        },
      }
    : {}; // No transformation if theme is invalid or not set

  // Resolve the request, applying theme transformation if applicable
  return resolve(event, transformOptions);
};

// Combine handles using sequence
// The order matters: setup -> guard -> theme/UI adjustments
export const handle: Handle = sequence(supabaseSetup, authGuard, themeHandler);
