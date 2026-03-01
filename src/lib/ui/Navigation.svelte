<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { supabase }: { supabase: SupabaseClient | null } = $props();

	const logout = async () => {
		if (!supabase) return;

		try {
			await supabase.auth.signOut();

			const response = await fetch('/auth/logout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				window.location.href = '/auth';
			} else {
				window.location.href = '/auth';
			}
		} catch (err) {
			console.error('Logout error:', err);
			window.location.href = '/auth';
		}
	};
</script>

<nav class="navbar bg-base-200 sticky top-0 z-50 shadow-lg">
	<div class="navbar-start">
		<a href={resolve('/')} class="btn btn-ghost text-xl normal-case">Home</a>
	</div>
	<div class="navbar-center">
		{#if page.url.pathname !== '/dashboard'}
			<a href={resolve('/dashboard')} class="btn btn-primary">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
					><path
						fill="currentColor"
						d="M13 8V4q0-.425.288-.712T14 3h6q.425 0 .713.288T21 4v4q0 .425-.288.713T20 9h-6q-.425 0-.712-.288T13 8M3 12V4q0-.425.288-.712T4 3h6q.425 0 .713.288T11 4v8q0 .425-.288.713T10 13H4q-.425 0-.712-.288T3 12m10 8v-8q0-.425.288-.712T14 11h6q.425 0 .713.288T21 12v8q0 .425-.288.713T20 21h-6q-.425 0-.712-.288T13 20M3 20v-4q0-.425.288-.712T4 15h6q.425 0 .713.288T11 16v4q0 .425-.288.713T10 21H4q-.425 0-.712-.288T3 20m2-9h4V5H5zm10 8h4v-6h-4zm0-12h4V5h-4zM5 19h4v-2H5zm4-2"
					/></svg
				>
				Dashboard
			</a>
		{/if}
	</div>
	<div class="navbar-end">
		<div class="dropdown dropdown-end">
			<button aria-label="Dropdown menu" tabindex="0" class="btn btn-ghost">
				<svg
					aria-hidden="true"
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16m-7 6h7"
					/></svg
				>
			</button>
			<ul class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow">
				<li>
					<a href={resolve('/dashboard/settings')} class="btn btn-ghost justify-start">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="mr-2 h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						Settings
					</a>
				</li>
				<li>
					<button class="btn btn-primary" onclick={logout}>Logout</button>
				</li>
			</ul>
		</div>
	</div>
</nav>
