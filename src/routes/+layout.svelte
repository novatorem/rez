<script lang="ts">
	import { invalidate } from '$app/navigation';
	import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
	import { themeChange } from 'theme-change';
	import '../app.css';

	let { data, children } = $props();
	let { session, supabase } = $derived(data);

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

<div class="bg-base-100 flex min-h-screen flex-col">
	<main class="flex-grow">
		{@render children()}
	</main>

	<footer class="footer footer-center bg-base-300 text-base-content p-4">
		<div>
			<p>Copyright © {new Date().getFullYear()} - All right reserved by MyApp Industries Ltd</p>
		</div>
	</footer>
</div>
