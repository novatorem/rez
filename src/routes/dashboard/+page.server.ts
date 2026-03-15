import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ depends, locals: { safeGetSession } }) => {
  depends('supabase:auth');

  const { session } = await safeGetSession();

  if (!session) {
    throw new Error('User not authenticated');
  }

  return {
    session
  };
};
