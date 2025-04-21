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

<div class="flex flex-col min-h-screen bg-base-100">

  <nav class="navbar bg-base-200 shadow-lg sticky top-0 z-50">
    <div class="navbar-start">
      <a href="/" class="btn btn-ghost normal-case text-xl">MyApp</a>
    </div>
    <div class="navbar-center hidden lg:flex">
      <ul class="menu menu-horizontal px-1">
        <li><a>Features</a></li>
        <li><a>Pricing</a></li>
        <li><a>About</a></li>
      </ul>
    </div>
    <div class="navbar-end">
      <a class="btn btn-primary">Get Started</a>
    </div>
    <div class="dropdown dropdown-end lg:hidden">
      <label tabindex="0" class="btn btn-ghost lg:hidden">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
      </label>
      <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
        <li><a>Features</a></li>
        <li><a>Pricing</a></li>
        <li><a>About</a></li>
      </ul>
    </div>
  </nav>

  <main class="flex-grow">
		{@render children()}
  </main>

  <footer class="footer footer-center p-4 bg-base-300 text-base-content">
    <div>
      <p>Copyright © {new Date().getFullYear()} - All right reserved by MyApp Industries Ltd</p>
    </div>
  </footer>

</div>
