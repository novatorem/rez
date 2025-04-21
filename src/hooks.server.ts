// Set NODE_TLS_REJECT_UNAUTHORIZED=0 only in development mode
// This allows self-signed certificates to be accepted
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log('⚠️ SSL certificate verification disabled for development');
}

import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { themes } from '$lib/themes';
import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import https from 'node:https';

// Create a custom agent that allows self-signed certificates in development
const isDev = process.env.NODE_ENV === 'development';
const httpsAgent = isDev
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;

// Custom fetch function that uses our HTTPS agent in development
const customFetch = (url: string, options: RequestInit = {}) => {
  if (isDev) {
    // In development, use node-fetch with our custom agent
    return fetch(url, {
      ...options,
      // @ts-ignore - Agent is not in standard RequestInit but works with Node.js fetch
      agent: httpsAgent
    });
  }
  // In production, use the standard fetch
  return fetch(url, options);
};

const supabase: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          event.cookies.set(name, value, { ...options, path: '/' })
        })
      },
    },
    global: {
      fetch: customFetch
    }
  })
  event.locals.safeGetSession = async () => {
    try {
      const {
        data: { session },
      } = await event.locals.supabase.auth.getSession()
      if (!session) {
        return { session: null, user: null }
      }

      const {
        data: { user },
        error,
      } = await event.locals.supabase.auth.getUser()
      if (error) {
        console.error("Error getting user:", error)
        return { session: null, user: null }
      }

      return { session, user }
    } catch (err) {
      console.error("Session error:", err)
      return { session: null, user: null }
    }
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version'
    },
  })
}

const authGuard: Handle = async ({ event, resolve }) => {
  const { session, user } = await event.locals.safeGetSession()
  event.locals.session = session
  event.locals.user = user

  if (!event.locals.session && event.url.pathname.startsWith('/dashboard')) {
    redirect(303, '/auth')
  }

  if (event.locals.session && event.url.pathname === '/auth') {
    redirect(303, '/dashboard')
  }

  return resolve(event)
}

const themeHandler: Handle = async ({ event, resolve }) => {
  const theme = event.cookies.get('theme');

  const isValidTheme = theme && themes.includes(theme);

  const transformOptions = isValidTheme
    ? {
        transformPageChunk: ({ html }: { html: string }) => {
          return html.replace(/<html(.*?)data-theme=(["'])(.*?)(\2)(.*?)>/, `<html$1data-theme="${theme}"$5>`);
        },
      }
    : {};

  return resolve(event, transformOptions);
};

export const handle: Handle = sequence(supabase, authGuard, themeHandler);
