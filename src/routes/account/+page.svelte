<script lang="ts">
	// @ts-ignore
	import { enhance, type SubmitFunction } from '$app/forms';
	import Avatar from './Avatar.svelte';

	export let data;
	export let form;

	let { session, supabase, profile } = data;
	$: ({ session, supabase, profile } = data);

	let profileForm: HTMLFormElement;
	let loading = false;
	let username: string = profile?.username ?? '';
	let fullName: string = profile?.full_name ?? '';
	let avatarUrl: string = profile?.avatar_url ?? '';

	const handleSubmit: SubmitFunction = () => {
		loading = true;
		return async () => {
			loading = false;
		};
	};

	const handleSignOut: SubmitFunction = () => {
		loading = true;
		// @ts-ignore
		return async ({ update }) => {
			loading = false;
			update();
		};
	};
</script>

<div class="m-12 flex items-center text-left justify-center md:text-justify">
	<div class="form-widget space-y-4">
		<form
			class="form-widget space-y-4"
			method="post"
			action="?/update"
			use:enhance={handleSubmit}
			bind:this={profileForm}
		>
			<Avatar {supabase} bind:url={avatarUrl} />
			<div>
				<label class="label" for="email">Email</label>
				<input
					id="email"
					class="input"
					title="Input (email)"
					type="email"
					placeholder="john@example.com"
					autocomplete="email"
					value={session.user.email}
					disabled
				/>
			</div>

			<div>
				<label for="fullName">User Name</label>
				<input
					class="input"
					id="username"
					title="Username"
					type="text"
					placeholder="friendlyGhost"
					name="username"
					value={form?.username ?? username}
				/>
			</div>

			<div>
				<label for="fullName">Display Name</label>
				<input
					class="input"
					id="fullName"
					title="Input (display name)"
					type="text"
					placeholder="A. N. Other"
					name="fullName"
					value={form?.fullName ?? fullName}
				/>
			</div>
			<!-- <div>
				<label for="username">Username</label>
				<input id="username" name="username" type="text" value={form?.username ?? username} />
			</div> -->

			<!-- <div>
				<label for="status">Status</label>
				<input id="status" name="status" type="text" value={form?.status ?? status} />
			</div> -->

			<div>
				<input
					type="submit"
					class="btn variant-filled"
					value={loading ? 'Loading...' : 'Update'}
					disabled={loading}
				/>
			</div>
		</form>

		<form method="post" action="?/signout" use:enhance={handleSignOut}>
			<div>
				<button class="btn variant-filled" disabled={loading}>Sign Out</button>
			</div>
		</form>
	</div>
</div>
