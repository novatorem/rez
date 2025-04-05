<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { themeChange } from 'theme-change';
	import '../app.css';

	let { data, children } = $props();
	let { session, supabase } = $derived(data);

	onMount(() => {
		themeChange(false);

		const { data } = supabase.auth.onAuthStateChange((_, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});
		return () => data.subscription.unsubscribe();
	});
</script>

{@render children()}
