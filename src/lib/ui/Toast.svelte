<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import type { Toast } from './toast.js';
  import { toastStore } from './toast.js';

  let { toast }: { toast: Toast } = $props();

  const alertClasses = {
    success: 'alert-success',
    error: 'alert-error',
    info: 'alert-info'
  };

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  const handleClose = () => {
    toastStore.remove(toast.id);
  };
</script>

<div
  class="alert {alertClasses[toast.type]} shadow-lg"
  in:fly={{ x: 48, y: -4, duration: 350, easing: cubicOut }}
  out:fly={{ x: 48, duration: 200, easing: cubicOut }}
  role="alert"
>
  <span class="text-lg font-semibold" aria-hidden="true">{getIcon(toast.type)}</span>
  <span class="flex-1">{toast.message}</span>
  <button
    class="btn btn-ghost btn-circle"
    onclick={handleClose}
    aria-label="Close notification"
  >
    ✕
  </button>
</div>
