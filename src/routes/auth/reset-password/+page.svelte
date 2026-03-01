<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { data } = $props();
	let { supabase, session } = $derived(data);

	let newPassword = $state('');
	let confirmPassword = $state('');
	let error = $state<string | null>(null);
	let isSubmitting = $state(false);

	let showNewPassword = $state(false);
	let showConfirmPassword = $state(false);

	let newPasswordTouched = $state(false);
	let confirmPasswordTouched = $state(false);

	const MIN_PASSWORD_LENGTH = 6;

	let newPasswordError = $derived(
		newPasswordTouched && newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH
			? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
			: null
	);
	let newPasswordValid = $derived(
		newPasswordTouched && newPassword.length >= MIN_PASSWORD_LENGTH
	);

	let confirmPasswordError = $derived(
		confirmPasswordTouched && confirmPassword.length > 0 && confirmPassword !== newPassword
			? 'Passwords do not match.'
			: null
	);
	let confirmPasswordValid = $derived(
		confirmPasswordTouched && confirmPassword.length > 0 && confirmPassword === newPassword && newPassword.length >= MIN_PASSWORD_LENGTH
	);

	const handleResetPassword = async (evt: Event) => {
		evt.preventDefault();
		error = null;

		if (newPassword.length < MIN_PASSWORD_LENGTH) {
			error = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
			return;
		}

		if (newPassword !== confirmPassword) {
			error = 'Passwords do not match.';
			return;
		}

		isSubmitting = true;
		try {
			const { error: updateError } = await supabase.auth.updateUser({
				password: newPassword
			});

			if (updateError) {
				error = updateError.message;
				return;
			}

			goto(resolve('/dashboard'));
		} catch {
			error = 'An unexpected error occurred. Please try again.';
		} finally {
			isSubmitting = false;
		}
	};
</script>

<div class="flex grow items-center justify-center p-4">
	<div class="card bg-base-100 w-full max-w-md shadow-xl">
		<div class="card-body gap-6 p-8 sm:p-10">
			{#if !session}
				<h1 class="text-base-content text-center text-3xl font-bold tracking-tight">
					Link Expired
				</h1>
				<p class="text-base-content/70 text-center text-base">
					This password reset link has expired or is invalid. Please request a new one.
				</p>
				<a href={resolve('/auth')} class="btn btn-primary h-12 w-full rounded-lg text-base font-semibold shadow-md">
					Back to Sign In
				</a>
			{:else}
				<h1 class="text-base-content text-center text-3xl font-bold tracking-tight">
					Set New Password
				</h1>
				<p class="text-base-content/70 text-center text-base">
					Enter your new password below.
				</p>

				{#if error}
					<div class="alert alert-error" role="alert">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span class="text-base">{error}</span>
					</div>
				{/if}

				<form onsubmit={handleResetPassword} class="space-y-5">
					<div class="form-control">
						<label class="label pb-1.5" for="new-password">
							<span class="label-text text-base font-semibold text-base-content">New password</span>
						</label>
						<div class="relative">
							<input
								id="new-password"
								type={showNewPassword ? 'text' : 'password'}
								autocomplete="new-password"
								placeholder="Enter new password (min. 6 characters)"
								bind:value={newPassword}
								required
								minlength={MIN_PASSWORD_LENGTH}
								aria-describedby={newPasswordError ? 'new-password-error' : undefined}
								aria-invalid={newPasswordError ? 'true' : undefined}
								onblur={() => (newPasswordTouched = true)}
								class="input input-bordered h-12 w-full px-4 pr-12 text-base {newPasswordError ? 'input-error' : ''} {newPasswordValid ? 'input-success' : ''}"
							/>
							<button
								type="button"
								class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-base-content/50 transition-colors hover:text-base-content"
								onclick={() => (showNewPassword = !showNewPassword)}
								aria-label={showNewPassword ? 'Hide password' : 'Show password'}
							>
								{#if showNewPassword}
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
										<line x1="1" y1="1" x2="23" y2="23" />
									</svg>
								{:else}
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
										<circle cx="12" cy="12" r="3" />
									</svg>
								{/if}
							</button>
						</div>
					<div id="new-password-error" class="mt-1.5 flex items-center gap-1.5 text-error" class:invisible={!newPasswordError} role={newPasswordError ? 'alert' : undefined}>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
						</svg>
						<span class="text-sm font-medium">{newPasswordError ?? '\u00A0'}</span>
					</div>
				</div>

				<div class="form-control">
					<label class="label pb-1.5" for="confirm-password">
							<span class="label-text text-base font-semibold text-base-content">Confirm new password</span>
						</label>
						<div class="relative">
							<input
								id="confirm-password"
								type={showConfirmPassword ? 'text' : 'password'}
								autocomplete="new-password"
								placeholder="Re-enter your new password"
								bind:value={confirmPassword}
								required
								minlength={MIN_PASSWORD_LENGTH}
								aria-describedby={confirmPasswordError ? 'confirm-password-error' : undefined}
								aria-invalid={confirmPasswordError ? 'true' : undefined}
								onblur={() => (confirmPasswordTouched = true)}
								class="input input-bordered h-12 w-full px-4 pr-12 text-base {confirmPasswordError ? 'input-error' : ''} {confirmPasswordValid ? 'input-success' : ''}"
							/>
							<button
								type="button"
								class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-base-content/50 transition-colors hover:text-base-content"
								onclick={() => (showConfirmPassword = !showConfirmPassword)}
								aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
							>
								{#if showConfirmPassword}
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
										<line x1="1" y1="1" x2="23" y2="23" />
									</svg>
								{:else}
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
										<circle cx="12" cy="12" r="3" />
									</svg>
								{/if}
							</button>
						</div>
					<div id="confirm-password-error" class="mt-1.5 flex items-center gap-1.5 text-error" class:invisible={!confirmPasswordError} role={confirmPasswordError ? 'alert' : undefined}>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
						</svg>
						<span class="text-sm font-medium">{confirmPasswordError ?? '\u00A0'}</span>
					</div>
				</div>

				<div class="form-control pt-1">
						<button
							type="submit"
							class="btn btn-primary h-12 w-full rounded-lg text-base font-semibold shadow-md"
							disabled={isSubmitting}
						>
							{#if isSubmitting}
								<span class="loading loading-spinner loading-sm"></span>
								Updating...
							{:else}
								Update Password
							{/if}
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
</div>
