<script lang="ts">
  import { toasts } from './toast.js';
  import Toast from './Toast.svelte';
</script>

<div class="toast toast-end toast-top z-50">
  {#each $toasts as toast (toast.id)}
    <Toast {toast} />
  {/each}
</div>
