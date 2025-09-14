<script>
	import Navigation from '$lib/Navigation.svelte';

	let { data, children } = $props();
	let { supabase } = $derived(data);
</script>

<Navigation {supabase} />

<main>
	{@render children()}
</main>
