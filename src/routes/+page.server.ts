import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals: { getSession } }) => {
	const session = await getSession();

	if (!session) {
		return { url: url.origin };
	}
};

export const actions = {
	update: async ({ request, locals: { supabase, getSession } }) => {
		const formData = await request.formData();
		const friendEmail = formData.get('friendEmail') as string;

		const session = await getSession();
		
		const { data } = await supabase
			.from('profiles')
			.select('id')
			.eq('email', friendEmail)
		
		const { error } = await supabase.from('requests').upsert({
			id: crypto.randomUUID(),
			sender: session?.user.email,
			receiver: friendEmail,
			status: 1
		});

		console.warn(error?.message)
		if (error) {
			return fail(500, {
				friendEmail, error
			});
		}

		return {
			friendEmail
		};
	}
};