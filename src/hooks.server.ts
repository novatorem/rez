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

const isDev = process.env.NODE_ENV === 'development';
const httpsAgent = isDev ? new https.Agent({ rejectUnauthorized: false }) : undefined;

const customFetch = (input: URL | RequestInfo, init?: RequestInit) => {
  if (isDev) {
    return fetch(input, {
      ...init,
      // @ts-expect-error - Agent is not in standard RequestInit but works with Node.js fetch
      agent: httpsAgent
    });
  }
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
          const host = event.url.hostname;

          const secureOptions = {
            ...options,
            path: '/',
            secure: event.url.protocol === 'https:',
            sameSite: 'lax' as const,
            domain: host.startsWith('localhost') || host.startsWith('127.0.0.1') ? undefined : host
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

const handleDevToolsRequests: Handle = async ({ event, resolve }) => {
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
