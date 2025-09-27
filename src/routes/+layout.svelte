<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import Footer from '$lib/Footer.svelte';
	import ToastContainer from '$lib/ToastContainer.svelte';
	import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
	import { themeChange } from 'theme-change';
	import '../app.css';

	let { data, children } = $props();
	let { session, supabase } = $derived(data);

	// Centralized title management based on current route
	let pageTitle = $state('Rez');

	// Update title based on current route
	$effect(() => {
		const pathname = page.url.pathname;

		if (pathname === '/') {
			pageTitle = 'Rez - Connect with others';
		} else if (pathname.startsWith('/dashboard/settings')) {
			pageTitle = 'Settings - Rez';
		} else if (pathname.startsWith('/dashboard')) {
			pageTitle = 'Dashboard - Rez';
		} else if (pathname.startsWith('/auth')) {
			pageTitle = 'Authentication - Rez';
		} else {
			pageTitle = 'Rez';
		}
	});

	$effect(() => {
		themeChange(false);

		if (!supabase) return;

		const { data: authListener } = supabase.auth.onAuthStateChange(
			(event: AuthChangeEvent, newSession: Session | null) => {
				// Only invalidate if there's a meaningful change
				if (
					event === 'SIGNED_OUT' ||
					event === 'SIGNED_IN' ||
					(event === 'TOKEN_REFRESHED' && newSession?.expires_at !== session?.expires_at)
				) {
					invalidate('supabase:auth');
				}

				// Handle token refresh errors by signing out silently
				if (event === 'TOKEN_REFRESHED' && !newSession) {
					// Token refresh failed, clear any remaining state
					supabase.auth.signOut({ scope: 'local' }).catch(() => {
						// Ignore errors when clearing tokens
					});
				}
			}
		);

		return () => authListener.subscription.unsubscribe();
	});
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<div class="bg-base-100 flex min-h-screen flex-col">
	<main class="flex-grow">
		{@render children()}
	</main>

	<Footer />
	<ToastContainer />
</div>
