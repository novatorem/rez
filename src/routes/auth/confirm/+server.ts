import type { EmailOtpType } from '@supabase/supabase-js';
import { redirect } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const next = url.searchParams.get('next') ?? '/dashboard';

  const redirectTo = new URL(url);
  redirectTo.pathname = next;
  redirectTo.searchParams.delete('token_hash');
  redirectTo.searchParams.delete('type');

  if (token_hash && type) {
    const { error } = await locals.supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirectTo.searchParams.delete('next');
      redirect(303, redirectTo);
    }
  } else {
    const { session } = await locals.safeGetSession();
    if (session) {
      redirect(303, '/dashboard');
    }
  }

  redirectTo.pathname = '/auth/error';
  redirect(303, redirectTo);
};
