// This file makes dashboard routes dynamic, ensuring hooks.server.ts auth guards run on every request.

import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		redirect(303, '/');
	}

	return {
		session
	};
};
