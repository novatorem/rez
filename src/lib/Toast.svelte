<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { Toast } from './toast-store.js';
	import { toastStore } from './toast-store.js';

	let { toast }: { toast: Toast } = $props();

	// Map toast types to DaisyUI alert classes
	const alertClasses = {
		success: 'alert-success',
		error: 'alert-error',
		info: 'alert-info'
	};

	// Get the appropriate icon for each type
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
	transition:fly={{ x: 300, duration: 300 }}
	role="alert"
>
	<span class="text-lg font-semibold" aria-hidden="true">{getIcon(toast.type)}</span>
	<span class="flex-1">{toast.message}</span>
	<button
		class="btn btn-ghost btn-sm btn-circle"
		onclick={handleClose}
		aria-label="Close notification"
	>
		✕
	</button>
</div>
