<script lang="ts">
  import { dev } from '$app/environment';
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
  let loginEmailValid = $derived(
    loginEmailTouched && loginEmail.length > 0 && isValidEmail(loginEmail)
  );

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
    signupPasswordTouched &&
      signupPassword.length > 0 &&
      signupPassword.length < MIN_PASSWORD_LENGTH
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

<div class="flex grow">
  <div
    class="bg-base-100 flex flex-1 flex-col items-center justify-center overflow-y-auto p-6 py-10 sm:p-10"
  >
    <div class="mb-8 w-full max-w-sm">
      <p class="text-primary text-xs font-bold tracking-[0.2em] uppercase">Rezonate</p>
    </div>

    {#key view}
      <div class="animate-fade-in-up-fast w-full max-w-sm">
        {#if view === 'login'}
          <h1 class="text-base-content mb-7 text-3xl font-bold tracking-tight">Welcome back.</h1>

          {#if loginError}
            <div class="alert alert-error animate-alert-in mb-5" role="alert">
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
                <span class="text-base font-medium">{loginError}</span>
                {#if dev}
                  <div class="mt-2">
                    <button
                      class="btn btn-sm btn-outline"
                      onclick={() => {
                        if (debugPanel) debugPanel.openPanel();
                      }}
                    >
                      View Debug Info
                    </button>
                  </div>
                {/if}
              </div>
              <button class="btn btn-sm btn-ghost" onclick={clearErrors} aria-label="Dismiss"
                >✕</button
              >
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
                  loginError = data.error || "Couldn't sign in. Check your email and password.";
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
                <span class="label-text text-base-content text-base font-semibold"
                  >Email address</span
                >
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
                  class="input input-bordered h-12 w-full px-4 text-base {loginEmailError
                    ? 'input-error'
                    : ''} {loginEmailValid ? 'input-success' : ''}"
                />
                {#if loginEmailValid}
                  <span
                    class="text-success pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                    aria-hidden="true"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </span>
                {/if}
              </div>
              <div
                id="login-email-error"
                class="text-error mt-1.5 flex items-center gap-1.5"
                class:invisible={!loginEmailError}
                role={loginEmailError ? 'alert' : undefined}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span class="text-sm font-medium">{loginEmailError ?? '\u00A0'}</span>
              </div>
            </div>

            <div class="form-control">
              <label class="label pb-1.5" for="login-password">
                <span class="label-text text-base-content text-base font-semibold">Password</span>
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
                  class="input input-bordered h-12 w-full px-4 pr-12 text-base {loginPasswordError
                    ? 'input-error'
                    : ''} {loginPasswordValid ? 'input-success' : ''}"
                />
                <button
                  type="button"
                  class="input-trailing-icon-btn"
                  onclick={() => (showLoginPassword = !showLoginPassword)}
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {#if showLoginPassword}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path
                        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
                      />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  {:else}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  {/if}
                </button>
              </div>
              <div
                id="login-password-error"
                class="text-error mt-1.5 flex items-center gap-1.5"
                class:invisible={!loginPasswordError}
                role={loginPasswordError ? 'alert' : undefined}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span class="text-sm font-medium">{loginPasswordError ?? '\u00A0'}</span>
              </div>
            </div>

            <div class="flex justify-end">
              <button
                type="button"
                class="link link-hover text-base-content/60 flex min-h-[44px] items-center text-sm font-medium"
                onclick={() => switchView('forgotPassword')}
              >
                Forgot password?
              </button>
            </div>

            <div class="form-control pt-1">
              <button type="submit" class="btn btn-primary h-12 w-full text-base font-semibold">
                Sign in
              </button>
            </div>
          </form>

          <p class="text-base-content/60 mt-6 text-sm">
            New to Rez?
            <button
              class="link link-primary inline-flex min-h-[44px] items-center font-semibold"
              onclick={() => switchView('signup')}
            >
              Create an account
            </button>
          </p>
        {:else if view === 'signup'}
          <h1 class="text-base-content mb-7 text-3xl font-bold tracking-tight">Join Rez.</h1>

          {#if signupError}
            <div class="alert alert-error animate-alert-in mb-5" role="alert">
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
                <span class="text-base font-medium">{signupError}</span>
                {#if dev}
                  <div class="mt-2">
                    <button
                      class="btn btn-sm btn-outline"
                      onclick={() => {
                        if (debugPanel) debugPanel.openPanel();
                      }}
                    >
                      View Debug Info
                    </button>
                  </div>
                {/if}
              </div>
              <button class="btn btn-sm btn-ghost" onclick={clearErrors} aria-label="Dismiss"
                >✕</button
              >
            </div>
          {/if}

          {#if signupSuccess}
            <div class="alert alert-success animate-alert-in mb-5" role="alert">
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
              <span class="text-base">{signupSuccess}</span>
              <button class="btn btn-sm btn-ghost" onclick={clearErrors} aria-label="Dismiss"
                >✕</button
              >
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
                  signupError = data.error || "Couldn't create your account. Please try again.";
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
                <span class="label-text text-base-content text-base font-semibold"
                  >Email address</span
                >
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
                  class="input input-bordered h-12 w-full px-4 text-base {signupEmailError
                    ? 'input-error'
                    : ''} {signupEmailValid ? 'input-success' : ''}"
                />
                {#if signupEmailValid}
                  <span
                    class="text-success pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                    aria-hidden="true"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </span>
                {/if}
              </div>
              <div
                id="signup-email-error"
                class="text-error mt-1.5 flex items-center gap-1.5"
                class:invisible={!signupEmailError}
                role={signupEmailError ? 'alert' : undefined}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span class="text-sm font-medium">{signupEmailError ?? '\u00A0'}</span>
              </div>
            </div>

            <div class="form-control">
              <label class="label pb-1.5" for="signup-password">
                <span class="label-text text-base-content text-base font-semibold">Password</span>
              </label>
              <div class="relative">
                <input
                  id="signup-password"
                  name="password"
                  type={showSignupPassword ? 'text' : 'password'}
                  autocomplete="new-password"
                  placeholder="At least 6 characters"
                  required
                  aria-required="true"
                  aria-describedby={signupPasswordError ? 'signup-password-error' : undefined}
                  aria-invalid={signupPasswordError ? 'true' : undefined}
                  bind:value={signupPassword}
                  onblur={() => (signupPasswordTouched = true)}
                  class="input input-bordered h-12 w-full px-4 pr-12 text-base {signupPasswordError
                    ? 'input-error'
                    : ''} {signupPasswordValid ? 'input-success' : ''}"
                />
                <button
                  type="button"
                  class="input-trailing-icon-btn"
                  onclick={() => (showSignupPassword = !showSignupPassword)}
                  aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                >
                  {#if showSignupPassword}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path
                        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
                      />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  {:else}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  {/if}
                </button>
              </div>
              <div
                id="signup-password-error"
                class="text-error mt-1.5 flex items-center gap-1.5"
                class:invisible={!signupPasswordError}
                role={signupPasswordError ? 'alert' : undefined}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span class="text-sm font-medium">{signupPasswordError ?? '\u00A0'}</span>
              </div>
            </div>

            <div class="form-control pt-1">
              <button type="submit" class="btn btn-primary h-12 w-full text-base font-semibold">
                Create account
              </button>
            </div>
          </form>

          <p class="text-base-content/60 mt-6 text-sm">
            Already have an account?
            <button
              class="link link-primary inline-flex min-h-[44px] items-center font-semibold"
              onclick={() => switchView('login')}
            >
              Sign in
            </button>
          </p>
        {:else if view === 'forgotPassword'}
          <h1 class="text-base-content mb-3 text-3xl font-bold tracking-tight">
            Forgot your password?
          </h1>

          <p class="text-base-content/60 mb-7 text-base">
            Enter your email and we'll send you a reset link.
          </p>

          {#if forgotPasswordSuccess}
            <div class="alert alert-success animate-alert-in mb-5" role="alert">
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
              <span class="text-base">{forgotPasswordSuccess}</span>
            </div>
          {/if}

          {#if forgotPasswordError}
            <div class="alert alert-error animate-alert-in mb-5" role="alert">
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
            <div class="form-control">
              <label class="label pb-1.5" for="forgot-email">
                <span class="label-text text-base-content text-base font-semibold"
                  >Email address</span
                >
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
              <button type="submit" class="btn btn-primary h-12 w-full text-base font-semibold">
                Send reset link
              </button>
            </div>
          </form>

          <p class="text-base-content/60 mt-6 text-sm">
            <button
              class="link link-primary inline-flex min-h-[44px] items-center font-semibold"
              onclick={() => switchView('login')}
            >
              Back to sign in
            </button>
          </p>
        {/if}
      </div>
    {/key}
  </div>
</div>

{#if dev}
  <DebugPanel bind:this={debugPanel} hasError={hasAuthError} />
{/if}
