<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import DebugPanel from '$lib/components/DebugPanel.svelte';

	let debugPanel: DebugPanel | null = $state(null);
	let errorMessage = $state<string | null>(null);
	let errorCode = $state<string | null>(null);
	let hasError = $state(false);

	$effect(() => {
		// Get error from URL parameters
		const urlParams = new URLSearchParams($page.url.search);
		errorMessage = urlParams.get('error') || urlParams.get('message') || null;
		errorCode = urlParams.get('code') || null;
		hasError = errorMessage !== null;

		// If we have error details, log them to debug panel
		if (errorMessage && debugPanel) {
			debugPanel.addDebugLog('error', 'Authentication error page', {
				message: errorMessage,
				code: errorCode,
				url: $page.url.href
			});
		}
	});
</script>

<div class="bg-base-200 flex min-h-screen items-center justify-center p-4">
	<div class="card bg-base-100 w-full max-w-md shadow-xl">
		<div class="card-body">
			<div class="card-title text-error mb-2 justify-center text-2xl">Authentication Error</div>

			<div class="alert alert-error mb-4">
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
					<span class="font-semibold">
						{errorMessage ? 'Error Details' : 'We couldn\'t sign you in. Please try again.'}
					</span>
					{#if errorMessage}
						<p class="text-sm mt-1">{errorMessage}</p>
					{/if}
					{#if errorCode}
						<p class="text-xs mt-1 opacity-75">Error Code: {errorCode}</p>
					{/if}
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
			</div>

			{#if !errorMessage}
				<p class="mb-4 text-center">
					There was a problem with your sign-in attempt. This could be due to:
				</p>

				<ul class="mb-6 list-inside list-disc">
					<li>Incorrect email or password</li>
					<li>Your account may not exist</li>
					<li>A temporary connection issue</li>
					<li>iOS Safari cookie restrictions (if on iPhone/iPad)</li>
				</ul>
			{/if}

			<div class="card-actions justify-center">
				<a href={resolve('/auth')} class="btn btn-primary">Back to Login</a>
				<a href={resolve('/')} class="btn btn-ghost">Home</a>
			</div>
		</div>
	</div>
</div>

<!-- Debug Panel - shows button on iOS, when errors occur, or when enabled -->
<DebugPanel bind:this={debugPanel} hasError={hasError} />
