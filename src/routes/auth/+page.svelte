<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import DebugPanel from '$lib/ui/DebugPanel.svelte';

	let activeTab = $state<'login' | 'signup'>('login');
	let signupError = $state<string | null>(null);
	let signupSuccess = $state<string | null>(null);
	let loginError = $state<string | null>(null);
	let debugPanel: DebugPanel | null = $state(null);
	let hasAuthError = $derived(signupError !== null || loginError !== null);

	function handleTabKeydown(e: KeyboardEvent, targetTab: 'login' | 'signup') {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			activeTab = targetTab;
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
			e.preventDefault();
			activeTab = activeTab === 'login' ? 'signup' : 'login';
		}
	}

	function clearErrors() {
		signupError = null;
		loginError = null;
		signupSuccess = null;
	}
</script>

<div class="bg-base-200 flex min-h-screen items-center justify-center p-4">
	<div class="card bg-base-100 w-full max-w-md shadow-xl">
		<div class="card-body">
			<h1 class="card-title mb-6 justify-center text-2xl">Welcome!</h1>

			<!-- Tabs for Login/Signup -->
			<div role="tablist" class="tabs tabs-boxed mb-6" aria-label="Authentication options">
				<button
					role="tab"
					aria-selected={activeTab === 'login'}
					aria-controls="login-panel"
					id="login-tab"
					class="tab flex-1"
					class:tab-active={activeTab === 'login'}
					onclick={() => (activeTab = 'login')}
					onkeydown={(e) => handleTabKeydown(e, 'login')}
				>
					Sign In
				</button>
				<button
					role="tab"
					aria-selected={activeTab === 'signup'}
					aria-controls="signup-panel"
					id="signup-tab"
					class="tab flex-1"
					class:tab-active={activeTab === 'signup'}
					onclick={() => (activeTab = 'signup')}
					onkeydown={(e) => handleTabKeydown(e, 'signup')}
				>
					Sign Up
				</button>
			</div>

			<!-- Login Form -->
			<div
				id="login-panel"
				role="tabpanel"
				aria-labelledby="login-tab"
				class:hidden={activeTab !== 'login'}
			>
				{#if loginError}
					<div class="alert alert-error mb-4" role="alert">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6 shrink-0 stroke-current"
							fill="none"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<div class="flex-1">
							<span>{loginError}</span>
							<div class="mt-2">
								<button
									class="btn btn-sm btn-outline"
									onclick={() => {
										if (debugPanel) {
											debugPanel.openPanel();
										}
									}}
								>
									View Debug Info
								</button>
							</div>
						</div>
						<button class="btn btn-sm btn-ghost" onclick={clearErrors}>✕</button>
					</div>
				{/if}

				<form
					method="POST"
					action="?/login"
					class="space-y-4"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'failure' && result.data) {
								const data = result.data as { error?: string; errorCode?: string };
								loginError = data.error || 'Login failed. Please try again.';
								if (debugPanel) {
									debugPanel.addDebugLog('error', 'Login form error', { errorCode: data.errorCode });
								}
							} else {
								await applyAction(result);
							}
						};
					}}
				>
					<div class="form-control">
						<label class="label" for="login-email">
							<span class="label-text font-medium">Email address</span>
						</label>
						<input
							id="login-email"
							name="email"
							type="email"
							autocomplete="email"
							placeholder="your@email.com"
							required
							aria-required="true"
							class="input input-bordered w-full"
						/>
					</div>

					<div class="form-control">
						<label class="label" for="login-password">
							<span class="label-text font-medium">Password</span>
						</label>
						<input
							id="login-password"
							name="password"
							type="password"
							autocomplete="current-password"
							placeholder="Enter your password"
							required
							aria-required="true"
							class="input input-bordered w-full"
						/>
					</div>

					<div class="form-control mt-6">
						<button type="submit" class="btn btn-primary w-full"> Sign In </button>
					</div>
				</form>
			</div>

			<!-- Signup Form -->
			<div
				id="signup-panel"
				role="tabpanel"
				aria-labelledby="signup-tab"
				class:hidden={activeTab !== 'signup'}
			>
				{#if signupError}
					<div class="alert alert-error mb-4" role="alert">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6 shrink-0 stroke-current"
							fill="none"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<div class="flex-1">
							<span class="font-semibold">Signup Error</span>
							<p class="text-sm">{signupError}</p>
							<div class="mt-2">
								<button
									class="btn btn-sm btn-outline"
									onclick={() => {
										if (debugPanel) {
											debugPanel.openPanel();
										}
									}}
								>
									View Debug Info
								</button>
							</div>
						</div>
						<button class="btn btn-sm btn-ghost" onclick={clearErrors}>✕</button>
					</div>
				{/if}

				{#if signupSuccess}
					<div class="alert alert-success mb-4" role="alert">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6 shrink-0 stroke-current"
							fill="none"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>{signupSuccess}</span>
						<button class="btn btn-sm btn-ghost" onclick={clearErrors}>✕</button>
					</div>
				{/if}

				<form
					method="POST"
					action="?/signup"
					class="space-y-4"
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
						<label class="label" for="signup-email">
							<span class="label-text font-medium">Email address</span>
						</label>
						<input
							id="signup-email"
							name="email"
							type="email"
							autocomplete="email"
							placeholder="your@email.com"
							required
							aria-required="true"
							class="input input-bordered w-full"
						/>
					</div>

					<div class="form-control">
						<label class="label" for="signup-password">
							<span class="label-text font-medium">Password</span>
						</label>
						<input
							id="signup-password"
							name="password"
							type="password"
							autocomplete="new-password"
							placeholder="Create a password"
							required
							aria-required="true"
							class="input input-bordered w-full"
						/>
					</div>

					<div class="form-control mt-6">
						<button type="submit" class="btn btn-primary w-full"> Create Account </button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>

<DebugPanel bind:this={debugPanel} hasError={hasAuthError} />
