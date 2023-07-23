<script lang="ts">
	// @ts-ignore
	import { enhance, type SubmitFunction } from '$app/forms';
	import { Auth } from '@supabase/auth-ui-svelte';
	import { ThemeSupa } from '@supabase/auth-ui-shared';

	export let data;
	export let form;

	let loading = false;
	let requestFriendshipForm: HTMLFormElement;
	let friendEmail: string = '';

	const requestFriendship: SubmitFunction = () => {
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
		<div class="container h-full mx-auto flex justify-center items-center">
			<form
				class="form-widget space-y-4"
				method="post"
				action="?/update"
				use:enhance={requestFriendship}
				bind:this={requestFriendshipForm}
			>
				<div class="input-group input-group-divider grid-cols-[auto_1fr_auto]">
					<input
						class="input"
						id="friendEmail"
						type="email"
						placeholder="a.n.other@mail.com"
						name="friendEmail"
						value={form?.friendEmail ?? friendEmail}
						autocomplete="email"
					/>
					<button class="variant-filled-secondary" disabled={loading}>Sync Person</button>
				</div>
			</form>
		</div>
	{/if}
</div>
