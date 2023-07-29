<script lang="ts">
	// @ts-ignore
	import { enhance, type SubmitFunction } from '$app/forms';
	import { Auth } from '@supabase/auth-ui-svelte';
	import { ThemeSupa } from '@supabase/auth-ui-shared';

	export let data;
	export let requestForm;
	export let statusForm;

	let { session, supabase, profile, requests } = data;
	$: ({ session, supabase, profile, requests } = data);

	let loading = false;
	let updateStatusForm: HTMLFormElement;
	let requestFriendshipForm: HTMLFormElement;
	let friendUserName: string = '';
	let status: string = profile?.status ?? '';
	let requestArray: any[] = requests ?? [];

	const requestFriendship: SubmitFunction = () => {
		loading = true;
		return async () => {
			loading = false;
		};
	};

	const updateStatus: SubmitFunction = () => {
		loading = true;
		return async () => {
			loading = false;
		};
	};
</script>

<div class="h-full w-full bg-surface-50-900-token">
	{#if data.session === null}
		<div class="container h-full mx-auto flex justify-center items-center">
			<div class="space-y-5">
				<div class="row flex-center flex">
					<div class="col-6 form-widget">
						<Auth
							supabaseClient={data.supabase}
							view="magic_link"
							redirectTo={`${data.url}/auth/callback`}
							showLinks={false}
							appearance={{ theme: ThemeSupa, style: { input: 'color: #fff' } }}
							additionalData={{}}
						/>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="container h-full mx-auto flex justify-center items-center flex-col space-y-8">
			<form
				class="form-widget space-y-4"
				method="post"
				action="?/updateStatus"
				use:enhance={updateStatus}
				bind:this={updateStatusForm}
			>
				<label for="status">Current status: {status}</label>
				<div class="input-group input-group-divider grid-cols-[auto_1fr_auto]">
					<input
						class="input"
						id="status"
						type="text"
						placeholder="Sleeping 💤"
						name="status"
						value={statusForm?.status ?? status}
					/>
					<button class="variant-filled-secondary" disabled={loading}>Update Status</button>
				</div>
			</form>

			<form
				class="form-widget space-y-4"
				method="post"
				action="?/requestFriendship"
				use:enhance={requestFriendship}
				bind:this={requestFriendshipForm}
			>
				<div class="input-group input-group-divider grid-cols-[auto_1fr_auto]">
					<input
						class="input"
						id="friendUserName"
						type="text"
						placeholder="friend's username"
						name="friendUserName"
						value={requestForm?.friendUserName ?? friendUserName}
					/>
					<button class="variant-filled-secondary" disabled={loading}>Sync Person</button>
				</div>
			</form>

			{#each requestArray as request}
				<div class="input-group input-group-divider grid-cols-[auto_1fr_auto]">
					<p>{request.receiver}</p>
					<button class="variant-filled-secondary" disabled={loading}>{request.status}</button>
				</div>
			{/each}
		</div>
	{/if}
</div>
