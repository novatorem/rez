<script lang="ts">
	import { formatStatusUpdatedAt } from '$lib/status/formatting';

	interface Props {
		timestamp: string | null;
	}

	let { timestamp }: Props = $props();
	let now = $state(Date.now());

	$effect(() => {
		const interval = setInterval(() => {
			now = Date.now();
		}, 30_000);
		return () => clearInterval(interval);
	});

	let display = $derived.by(() => {
		void now;
		return formatStatusUpdatedAt(timestamp);
	});
</script>

{display}
