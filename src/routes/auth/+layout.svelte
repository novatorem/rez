<script>
	let { children } = $props();
</script>

<header>
	<nav class="navbar bg-base-200 sticky top-0 z-50 shadow-lg">
		<div class="navbar-start">
			<a href="/" class="btn btn-ghost text-xl normal-case">Home</a>
		</div>
		<div class="navbar-center hidden lg:flex">
			<ul class="menu menu-horizontal px-1">
				<li><a>Features</a></li>
				<li><a>About</a></li>
			</ul>
		</div>
		<div class="navbar-end">
			<a href="/dashboard" class="btn btn-primary">Get Started</a>
		</div>
		<div class="dropdown dropdown-end lg:hidden">
			<label tabindex="0" class="btn btn-ghost lg:hidden">
				<svg
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
			</label>
			<ul
				tabindex="0"
				class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
			>
				<li><a>Features</a></li>
				<li><a>About</a></li>
			</ul>
		</div>
	</nav>
</header>

{@render children()}
