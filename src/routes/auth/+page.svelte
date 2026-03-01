<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import DebugPanel from '$lib/ui/DebugPanel.svelte';

	type AuthView = 'login' | 'signup' | 'forgotPassword';

	let view = $state<AuthView>('login');
	let signupError = $state<string | null>(null);
	let signupSuccess = $state<string | null>(null);
	let loginError = $state<string | null>(null);
	let forgotPasswordSuccess = $state<string | null>(null);
	let forgotPasswordError = $state<string | null>(null);
	let debugPanel: DebugPanel | null = $state(null);
	let hasAuthError = $derived(signupError !== null || loginError !== null);

	let showLoginPassword = $state(false);
	let showSignupPassword = $state(false);

	let loginEmail = $state('');
	let loginPassword = $state('');
	let loginEmailTouched = $state(false);
	let loginPasswordTouched = $state(false);

	let signupEmail = $state('');
	let signupPassword = $state('');
	let signupEmailTouched = $state(false);
	let signupPasswordTouched = $state(false);

	const MIN_PASSWORD_LENGTH = 6;

	function isValidEmail(email: string): boolean {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	}

	let loginEmailError = $derived(
		loginEmailTouched && loginEmail.length > 0 && !isValidEmail(loginEmail)
			? 'Please enter a valid email address.'
			: null
	);
	let loginEmailValid = $derived(loginEmailTouched && loginEmail.length > 0 && isValidEmail(loginEmail));

	let loginPasswordError = $derived(
		loginPasswordTouched && loginPassword.length > 0 && loginPassword.length < MIN_PASSWORD_LENGTH
			? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
			: null
	);
	let loginPasswordValid = $derived(
		loginPasswordTouched && loginPassword.length >= MIN_PASSWORD_LENGTH
	);

	let signupEmailError = $derived(
		signupEmailTouched && signupEmail.length > 0 && !isValidEmail(signupEmail)
			? 'Please enter a valid email address.'
			: null
	);
	let signupEmailValid = $derived(
		signupEmailTouched && signupEmail.length > 0 && isValidEmail(signupEmail)
	);

	let signupPasswordError = $derived(
		signupPasswordTouched && signupPassword.length > 0 && signupPassword.length < MIN_PASSWORD_LENGTH
			? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
			: null
	);
	let signupPasswordValid = $derived(
		signupPasswordTouched && signupPassword.length >= MIN_PASSWORD_LENGTH
	);

	function clearErrors() {
		signupError = null;
		loginError = null;
		signupSuccess = null;
		forgotPasswordSuccess = null;
		forgotPasswordError = null;
	}

	function switchView(target: AuthView) {
		view = target;
		clearErrors();
		loginEmailTouched = false;
		loginPasswordTouched = false;
		signupEmailTouched = false;
		signupPasswordTouched = false;
		showLoginPassword = false;
		showSignupPassword = false;
	}
</script>

<div class="flex grow items-center justify-center p-4">
	<div class="card bg-base-100 w-full max-w-md shadow-xl">
		<div class="card-body gap-6 p-8 sm:p-10">

			{#if view === 'login'}
				<h1 class="text-base-content text-center text-3xl font-bold tracking-tight">
					Sign In
				</h1>

				{#if loginError}
					<div class="alert alert-error" role="alert">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<div class="flex-1">
							<span class="text-base font-medium">{loginError}</span>
							<div class="mt-2">
								<button
									class="btn btn-sm btn-outline"
									onclick={() => { if (debugPanel) debugPanel.openPanel(); }}
								>
									View Debug Info
								</button>
							</div>
						</div>
						<button class="btn btn-sm btn-ghost" onclick={clearErrors} aria-label="Dismiss error">✕</button>
					</div>
				{/if}

				<form
					method="POST"
					action="?/login"
					class="space-y-5"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'failure' && result.data) {
								const data = result.data as { error?: string; errorCode?: string };
								loginError = data.error || 'Login failed. Please try again.';
								if (debugPanel) {
									debugPanel.addDebugLog('error', 'Login form error', {
										errorCode: data.errorCode
									});
								}
							} else {
								await applyAction(result);
							}
						};
					}}
				>
					<div class="form-control">
						<label class="label pb-1.5" for="login-email">
							<span class="label-text text-base font-semibold text-base-content">Email address</span>
						</label>
						<div class="relative">
							<input
								id="login-email"
								name="email"
								type="email"
								autocomplete="email"
								placeholder="you@example.com"
								required
								aria-required="true"
								aria-describedby={loginEmailError ? 'login-email-error' : undefined}
								aria-invalid={loginEmailError ? 'true' : undefined}
								bind:value={loginEmail}
								onblur={() => (loginEmailTouched = true)}
								class="input input-bordered h-12 w-full px-4 text-base {loginEmailError ? 'input-error' : ''} {loginEmailValid ? 'input-success' : ''}"
							/>
							{#if loginEmailValid}
								<span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-success" aria-hidden="true">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
									</svg>
								</span>
							{/if}
						</div>
					<div id="login-email-error" class="mt-1.5 flex items-center gap-1.5 text-error" class:invisible={!loginEmailError} role={loginEmailError ? 'alert' : undefined}>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
						</svg>
						<span class="text-sm font-medium">{loginEmailError ?? '\u00A0'}</span>
					</div>
				</div>

				<div class="form-control">
					<label class="label pb-1.5" for="login-password">
							<span class="label-text text-base font-semibold text-base-content">Password</span>
						</label>
						<div class="relative">
							<input
								id="login-password"
								name="password"
								type={showLoginPassword ? 'text' : 'password'}
								autocomplete="current-password"
								placeholder="Enter your password"
								required
								aria-required="true"
								aria-describedby={loginPasswordError ? 'login-password-error' : undefined}
								aria-invalid={loginPasswordError ? 'true' : undefined}
								bind:value={loginPassword}
								onblur={() => (loginPasswordTouched = true)}
								class="input input-bordered h-12 w-full px-4 pr-12 text-base {loginPasswordError ? 'input-error' : ''} {loginPasswordValid ? 'input-success' : ''}"
							/>
							<button
								type="button"
								class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-base-content/50 transition-colors hover:text-base-content"
								onclick={() => (showLoginPassword = !showLoginPassword)}
								aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
							>
								{#if showLoginPassword}
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
					<div id="login-password-error" class="mt-1.5 flex items-center gap-1.5 text-error" class:invisible={!loginPasswordError} role={loginPasswordError ? 'alert' : undefined}>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
						</svg>
						<span class="text-sm font-medium">{loginPasswordError ?? '\u00A0'}</span>
					</div>
				</div>

				<div class="flex justify-end">
						<button
							type="button"
							class="link link-hover text-base-content/70 text-sm font-medium min-h-[44px] flex items-center"
							onclick={() => switchView('forgotPassword')}
						>
							Forgot password?
						</button>
					</div>

					<div class="form-control pt-1">
						<button type="submit" class="btn btn-primary h-12 w-full rounded-lg text-base font-semibold shadow-md">
							Sign In
						</button>
					</div>
				</form>

				<p class="mt-2 text-center text-base text-base-content/70">
					New user?
					<button
						class="link link-primary font-semibold min-h-[44px] inline-flex items-center"
						onclick={() => switchView('signup')}
					>
						Create an account here
					</button>
				</p>

			{:else if view === 'signup'}
				<h1 class="text-base-content text-center text-3xl font-bold tracking-tight">
					Create Account
				</h1>

				{#if signupError}
					<div class="alert alert-error" role="alert">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<div class="flex-1">
							<span class="text-base font-medium">{signupError}</span>
							<div class="mt-2">
								<button
									class="btn btn-sm btn-outline"
									onclick={() => { if (debugPanel) debugPanel.openPanel(); }}
								>
									View Debug Info
								</button>
							</div>
						</div>
						<button class="btn btn-sm btn-ghost" onclick={clearErrors} aria-label="Dismiss error">✕</button>
					</div>
				{/if}

				{#if signupSuccess}
					<div class="alert alert-success" role="alert">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span class="text-base">{signupSuccess}</span>
						<button class="btn btn-sm btn-ghost" onclick={clearErrors} aria-label="Dismiss message">✕</button>
					</div>
				{/if}

				<form
					method="POST"
					action="?/signup"
					class="space-y-5"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'failure' && result.data) {
								const data = result.data as {
									error?: string;
									errorCode?: string;
									errorName?: string;
									isIOS?: boolean;
								};
								signupError = data.error || 'Signup failed. Please try again.';
								if (debugPanel) {
									debugPanel.addDebugLog('error', 'Signup form error', data);
								}
							} else if (result.type === 'success' && result.data) {
								const data = result.data as { requiresConfirmation?: boolean; message?: string };
								if (data.requiresConfirmation) {
									signupSuccess =
										data.message || 'Please check your email to confirm your account.';
									signupError = null;
								} else {
									await applyAction(result);
								}
							} else {
								await applyAction(result);
							}
						};
					}}
				>
					<div class="form-control">
						<label class="label pb-1.5" for="signup-email">
							<span class="label-text text-base font-semibold text-base-content">Email address</span>
						</label>
						<div class="relative">
							<input
								id="signup-email"
								name="email"
								type="email"
								autocomplete="email"
								placeholder="you@example.com"
								required
								aria-required="true"
								aria-describedby={signupEmailError ? 'signup-email-error' : undefined}
								aria-invalid={signupEmailError ? 'true' : undefined}
								bind:value={signupEmail}
								onblur={() => (signupEmailTouched = true)}
								class="input input-bordered h-12 w-full px-4 text-base {signupEmailError ? 'input-error' : ''} {signupEmailValid ? 'input-success' : ''}"
							/>
							{#if signupEmailValid}
								<span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-success" aria-hidden="true">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
									</svg>
								</span>
							{/if}
						</div>
					<div id="signup-email-error" class="mt-1.5 flex items-center gap-1.5 text-error" class:invisible={!signupEmailError} role={signupEmailError ? 'alert' : undefined}>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
						</svg>
						<span class="text-sm font-medium">{signupEmailError ?? '\u00A0'}</span>
					</div>
				</div>

				<div class="form-control">
					<label class="label pb-1.5" for="signup-password">
							<span class="label-text text-base font-semibold text-base-content">Password</span>
						</label>
						<div class="relative">
							<input
								id="signup-password"
								name="password"
								type={showSignupPassword ? 'text' : 'password'}
								autocomplete="new-password"
								placeholder="Create a password (min. 6 characters)"
								required
								aria-required="true"
								aria-describedby={signupPasswordError ? 'signup-password-error' : undefined}
								aria-invalid={signupPasswordError ? 'true' : undefined}
								bind:value={signupPassword}
								onblur={() => (signupPasswordTouched = true)}
								class="input input-bordered h-12 w-full px-4 pr-12 text-base {signupPasswordError ? 'input-error' : ''} {signupPasswordValid ? 'input-success' : ''}"
							/>
							<button
								type="button"
								class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-base-content/50 transition-colors hover:text-base-content"
								onclick={() => (showSignupPassword = !showSignupPassword)}
								aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
							>
								{#if showSignupPassword}
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
					<div id="signup-password-error" class="mt-1.5 flex items-center gap-1.5 text-error" class:invisible={!signupPasswordError} role={signupPasswordError ? 'alert' : undefined}>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
						</svg>
						<span class="text-sm font-medium">{signupPasswordError ?? '\u00A0'}</span>
					</div>
				</div>

				<div class="form-control pt-1">
					<button type="submit" class="btn btn-primary h-12 w-full rounded-lg text-base font-semibold shadow-md">
						Create Account
						</button>
					</div>
				</form>

				<p class="mt-2 text-center text-base text-base-content/70">
					Already have an account?
					<button
						class="link link-primary font-semibold min-h-[44px] inline-flex items-center"
						onclick={() => switchView('login')}
					>
						Sign in
					</button>
				</p>

			{:else if view === 'forgotPassword'}
				<h1 class="text-base-content text-center text-3xl font-bold tracking-tight">
					Reset Password
				</h1>

				{#if forgotPasswordSuccess}
					<div class="alert alert-success" role="alert">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span class="text-base">{forgotPasswordSuccess}</span>
					</div>
				{/if}

				{#if forgotPasswordError}
					<div class="alert alert-error" role="alert">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span class="text-base">{forgotPasswordError}</span>
					</div>
				{/if}

				<form
					method="POST"
					action="?/forgotPassword"
					class="space-y-5"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'failure' && result.data) {
								const data = result.data as { error?: string };
								forgotPasswordError =
									data.error || 'Failed to send reset email. Please try again.';
							} else if (result.type === 'success' && result.data) {
								const data = result.data as { message?: string };
								forgotPasswordSuccess =
									data.message ||
									"If an account exists with that email, you'll receive a reset link.";
								forgotPasswordError = null;
							}
						};
					}}
				>
					<p class="text-base-content/70 text-base">
						Enter your email address and we'll send you a link to reset your password.
					</p>

					<div class="form-control">
						<label class="label pb-1.5" for="forgot-email">
							<span class="label-text text-base font-semibold text-base-content">Email address</span>
						</label>
						<input
							id="forgot-email"
							name="email"
							type="email"
							autocomplete="email"
							placeholder="you@example.com"
							required
							aria-required="true"
							class="input input-bordered h-12 w-full px-4 text-base"
						/>
					</div>

					<div class="form-control pt-1">
						<button type="submit" class="btn btn-primary h-12 w-full rounded-lg text-base font-semibold shadow-md">
							Send Reset Link
						</button>
					</div>
				</form>

				<p class="mt-2 text-center text-base text-base-content/70">
					<button
						class="link link-primary font-semibold min-h-[44px] inline-flex items-center"
						onclick={() => switchView('login')}
					>
						Back to Sign In
					</button>
				</p>
			{/if}
		</div>
	</div>
</div>

<DebugPanel bind:this={debugPanel} hasError={hasAuthError} />
