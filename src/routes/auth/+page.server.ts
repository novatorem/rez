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

    const emailConfirmationRequired = data.user && !data.session;
    if (emailConfirmationRequired) {
      return {
        requiresConfirmation: true,
        message: 'Please check your email to confirm your account before signing in.',
        email
      };
    }

    if (data.session) {
      redirect(303, '/dashboard');
    }

    return fail(500, {
      error: 'Signup completed but no session was created. Please try logging in.',
      email
    });
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
  },
  forgotPassword: async ({ request, locals: { supabase }, url }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${url.origin}/auth/confirm?next=/auth/reset-password`
    });

    return {
      forgotPasswordSuccess: true,
      message: "If an account exists with that email, you'll receive a password reset link."
    };
  }
};
