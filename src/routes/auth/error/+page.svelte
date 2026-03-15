<script lang="ts">
  import { dev } from '$app/environment';
  import { resolve } from '$app/paths';
  import { page } from '$app/stores';
  import DebugPanel from '$lib/ui/DebugPanel.svelte';

  let debugPanel: DebugPanel | null = $state(null);
  let errorMessage = $state<string | null>(null);
  let errorCode = $state<string | null>(null);
  let hasError = $state(false);

  $effect(() => {
    const urlParams = new URLSearchParams($page.url.search);
    errorMessage = urlParams.get('error') || urlParams.get('message') || null;
    errorCode = urlParams.get('code') || null;
    hasError = errorMessage !== null;

    if (errorMessage && debugPanel) {
      debugPanel.addDebugLog('error', 'Authentication error page', {
        message: errorMessage,
        code: errorCode,
        url: $page.url.href
      });
    }
  });
</script>

<div class="flex grow items-center justify-center p-4">
  <div class="card bg-base-100 w-full max-w-md shadow-xl">
    <div class="card-body gap-6 p-8 sm:p-10">
      <h1 class="text-error text-center text-3xl font-bold tracking-tight">
        Couldn't sign you in
      </h1>

      <div class="alert alert-error" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="flex-1">
          <span class="text-base font-semibold">
            {errorMessage ? 'Something went wrong' : "We couldn't sign you in. Please try again."}
          </span>
          {#if errorMessage}
            <p class="mt-1 text-base">{errorMessage}</p>
          {/if}
          {#if dev && errorCode}
            <p class="mt-1 text-sm opacity-75">Error Code: {errorCode}</p>
          {/if}
          {#if dev}
            <div class="mt-3">
              <button
                class="btn btn-sm btn-outline"
                onclick={() => { if (debugPanel) debugPanel.openPanel(); }}
              >
                View Debug Info
              </button>
            </div>
          {/if}
        </div>
      </div>

      {#if !errorMessage}
        <p class="text-base-content/80 text-center text-base">
          There was a problem with your sign-in attempt. This could be due to:
        </p>

        <ul class="text-base-content/80 list-inside list-disc space-y-1 text-base">
          <li>Wrong email or password</li>
          <li>No account with that email</li>
          <li>A temporary connection issue</li>
          <li>Sign-in blocked by browser settings</li>
        </ul>
      {/if}

      <div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a href={resolve('/auth')} class="btn btn-primary h-12 rounded-lg px-8 text-base font-semibold shadow-md">
          Back to sign in
        </a>
        <a href={resolve('/')} class="btn btn-ghost h-12 rounded-lg px-8 text-base font-semibold">
          Home
        </a>
      </div>
    </div>
  </div>
</div>

<DebugPanel bind:this={debugPanel} hasError={hasError} />
