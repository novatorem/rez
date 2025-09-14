<script lang="ts">
	import { toasts } from './toast-store.js';
	import Toast from './Toast.svelte';
</script>

<!-- Toast container positioned at the top-right corner -->
<div class="toast toast-end toast-top z-50">
	{#each $toasts as toast (toast.id)}
		<Toast {toast} />
	{/each}
</div>
