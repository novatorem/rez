import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
  if (locals.supabase) {
    await locals.supabase.auth.signOut();
  }

  const authCookieNames = [
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token',
    'supabase.auth.token'
  ];

  const allCookies = cookies.getAll();
  allCookies.forEach((cookie) => {
    if (cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
      cookies.delete(cookie.name, { path: '/' });
    }
  });

  authCookieNames.forEach((name) => {
    cookies.delete(name, { path: '/' });
    cookies.delete(name, { path: '/', domain: undefined });
  });

  throw redirect(303, '/auth');
};
