<script lang="ts">
  import { fly } from 'svelte/transition';
  import type { Toast } from './toast.js';
  import { toastStore } from './toast.js';

  let { toast }: { toast: Toast } = $props();

  const alertClasses = {
    success: 'alert-success',
    error: 'alert-error',
    info: 'alert-info'
  };

  const handleClose = () => {
    toastStore.remove(toast.id);
  };
</script>

<div
  class="alert {alertClasses[toast.type]} shadow-lg"
  in:fly={{ x: 48, y: -4, duration: 350, easing: (t) => 1 - Math.pow(1 - t, 4) }}
  out:fly={{ x: 48, duration: 200, easing: (t) => 1 - Math.pow(1 - t, 4) }}
  role="alert"
>
  {#if toast.type === 'success'}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5 shrink-0 stroke-current"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  {:else if toast.type === 'error'}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5 shrink-0 stroke-current"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  {:else}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5 shrink-0 stroke-current"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  {/if}
  <span class="flex-1 text-sm">{toast.message}</span>
  <button
    class="btn btn-ghost btn-circle btn-sm"
    onclick={handleClose}
    aria-label="Close: {toast.message}"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-4 w-4 stroke-current"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  </button>
</div>
