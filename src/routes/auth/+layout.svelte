<script>
	import DotGridBackground from '$lib/ui/DotGridBackground.svelte';

	let { children } = $props();
</script>

<div class="bg-base-200 relative flex grow">
	<DotGridBackground />
	{@render children()}
</div>
