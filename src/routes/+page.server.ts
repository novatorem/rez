import { fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

let username = '';

export const load: PageServerLoad = async ({ url, locals: { supabase, getSession } }) => {
	const session = await getSession();

	if (!session) {
		return { url: url.origin };
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select(`status, username`)
		.eq('id', session.user.id)
		.single();

	username = profile?.username;

	const { data: requests } = await supabase
		.from('requests')
		.select(`status, receiver`)
		.eq('sender', username);

	return { session, profile, requests };
};

export const actions = {
	requestFriendship: async ({ request, locals: { supabase, getSession } }) => {
		const formData = await request.formData();
		const friendUserName = formData.get('friendUserName') as string;

		const session = await getSession();

		const receiverId = await GetId(supabase, friendUserName);
		const senderUsername = await GetUsername(supabase, session!.user.id);
		
		const { error } = await supabase.from('requests').upsert({
			id: crypto.randomUUID(),
			sender: senderUsername,
			senderId: session?.user.id,
			receiver: friendUserName,
			receiverId: receiverId,
			status: 1
		});

		if (error) {
			console.warn(error!.message);
			return fail(500, {
				friendUserName,
				error
			});
		}

		return {
			friendUserName
		};
	},
	updateStatus: async ({ request, locals: { supabase, getSession } }) => {
		const formData = await request.formData();
		const status = formData.get('status') as string;

		const session = await getSession();

		const { error } = await supabase
			.from('profiles')
			.update({
				status: status
			})
			.eq('id', session!.user.id);

		if (error) {
			console.warn(error!.message);
			return fail(500, {
				status,
				error
			});
		}

		return {
			status
		};
	}
};

async function GetUsername(supabase: any, id: string): Promise<{ data: any }> {
	return (await supabase.from('profiles').select('username').eq('id', id).single()).data.username;
}

async function GetId(supabase: any, username: string): Promise<{ data: any }> {
	return (await supabase.from('profiles').select('id').eq('username', username).single()).data.id;
}
