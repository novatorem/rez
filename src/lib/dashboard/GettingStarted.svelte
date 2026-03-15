<script lang="ts">
  import { browser } from '$app/environment';
  import { cubicOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';

  const DISMISSED_KEY = 'rez-onboarding-dismissed';

  interface Props {
    hasStatus: boolean;
    hasFriends: boolean;
  }

  let { hasStatus, hasFriends }: Props = $props();

  let dismissed = $state(browser ? localStorage.getItem(DISMISSED_KEY) === 'true' : false);

  const allDone = $derived(hasStatus && hasFriends);

  // Auto-dismiss once both tasks are complete (after a short delay so user sees the completion)
  $effect(() => {
    if (allDone && !dismissed) {
      const timer = setTimeout(() => {
        dismiss();
      }, 1800);
      return () => clearTimeout(timer);
    }
  });

  function dismiss() {
    dismissed = true;
    if (browser) localStorage.setItem(DISMISSED_KEY, 'true');
  }
</script>

{#if !dismissed}
  <div
    class="card bg-base-200 border-primary/20 mb-4 border"
    out:fly={{ y: -12, duration: 220, easing: cubicOut }}
  >
    <div class="card-body p-4 sm:p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <h2 class="mb-1 text-base font-semibold">Get started</h2>
          <p class="text-base-content/60 mb-3 text-sm">
            Two steps to start seeing what your friends are up to.
          </p>

          <ul class="space-y-2">
            <li class="flex items-center gap-3">
              <span
                class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-300 {hasStatus
                  ? 'bg-success text-success-content'
                  : 'border-base-content/30 border-2'}"
              >
                {#if hasStatus}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="3"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                {/if}
              </span>
              <span
                class="text-sm transition-colors duration-300 {hasStatus
                  ? 'text-base-content/50 line-through'
                  : 'text-base-content'}"
              >
                Set your status - let friends know what you're up to
              </span>
            </li>

            <li class="flex items-center gap-3">
              <span
                class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-300 {hasFriends
                  ? 'bg-success text-success-content'
                  : 'border-base-content/30 border-2'}"
              >
                {#if hasFriends}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="3"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                {/if}
              </span>
              <span
                class="text-sm transition-colors duration-300 {hasFriends
                  ? 'text-base-content/50 line-through'
                  : 'text-base-content'}"
              >
                Add a friend - search by username below
              </span>
            </li>
          </ul>
        </div>

        <button
          class="text-base-content/40 hover:text-base-content/70 flex-shrink-0 transition-colors"
          onclick={dismiss}
          aria-label="Dismiss getting started guide"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
{/if}
