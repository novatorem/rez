<script>
	import { resolve } from '$app/paths';

	export let supabase;

	const logout = async () => {
		if (!supabase) return;

		try {
			// First, sign out from Supabase client-side
			await supabase.auth.signOut();

			// Then call the server-side logout endpoint for thorough cleanup
			const response = await fetch('/auth/logout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				// Server-side logout successful, redirect will be handled by the endpoint
				window.location.href = '/auth';
			} else {
				// Fallback: force redirect even if server-side logout fails
				window.location.href = '/auth';
			}
		} catch (err) {
			console.error('Logout error:', err);
			// Even if there's an error, redirect to auth page
			window.location.href = '/auth';
		}
	};
</script>

<nav class="navbar bg-base-200 sticky top-0 z-50 shadow-lg">
	<div class="navbar-start">
		<a href={resolve('/')} class="btn btn-ghost text-xl normal-case">Home</a>
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
