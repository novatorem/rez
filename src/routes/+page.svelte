<script lang="ts">
	import { onMount } from 'svelte';

	let featuresRef: HTMLElement;

	onMount(() => {
		// Add scroll animations
		const observerOptions = {
			threshold: 0.1,
			rootMargin: '0px 0px -50px 0px'
		};

		const observer = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add('animate-fade-in');
				}
			});
		}, observerOptions);

		if (featuresRef) observer.observe(featuresRef);

		return () => observer.disconnect();
	});
</script>

<!-- Hero Section -->
<div class="hero from-primary to-secondary text-primary-content min-h-screen bg-gradient-to-br">
	<div class="hero-overlay bg-opacity-60"></div>
	<div class="hero-content text-center">
		<div class="animate-fade-in-up max-w-md">
			<h1 class="mb-5 text-5xl font-bold md:text-7xl">
				<span class="gradient-text block">Rezonate</span>
				with others
			</h1>
			<p class="mb-5 text-xl md:text-2xl">
				Connect to people. Stay up to date. Always in the know.
			</p>
			<div class="flex flex-col gap-4 sm:flex-row sm:justify-center">
				<a href="/dashboard" class="btn btn-accent btn-lg animate-pulse-slow">
					Join the Universe
				</a>
			</div>
		</div>
	</div>

	<!-- Floating Elements -->
	<div
		class="animate-float bg-primary-content/10 absolute top-20 left-10 h-20 w-20 rounded-full"
	></div>
	<div
		class="animate-float bg-primary-content/10 absolute top-40 right-20 h-16 w-16 rounded-full"
		style="animation-delay: -2s;"
	></div>
	<div
		class="animate-float bg-primary-content/10 absolute bottom-20 left-20 h-12 w-12 rounded-full"
		style="animation-delay: -4s;"
	></div>
	<div
		class="animate-float bg-primary-content/10 absolute right-10 bottom-40 h-24 w-24 rounded-full"
		style="animation-delay: -1s;"
	></div>
</div>

<!-- Features Section -->
<section id="features" bind:this={featuresRef} class="bg-base-200 py-20">
	<div class="container mx-auto px-4">
		<div class="mb-12 text-center">
			<h2 class="mb-4 text-4xl font-bold">
				Why use <span class="gradient-text">Rez</span>?
			</h2>
		</div>

		<div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
			<div class="card bg-base-100 feature-card shadow-xl">
				<figure class="px-10 pt-10">
					<div
						class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500"
					>
						<svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
							></path>
						</svg>
					</div>
				</figure>
				<div class="card-body items-center text-center">
					<h3 class="card-title text-2xl">Secure & Reliable</h3>
					<p class="text-base-content/70">Export or delete your data at any time.</p>
				</div>
			</div>

			<div class="card bg-base-100 feature-card shadow-xl">
				<figure class="px-10 pt-10">
					<div
						class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500"
					>
						<svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
							></path>
						</svg>
					</div>
				</figure>
				<div class="card-body items-center text-center">
					<h3 class="card-title text-2xl">Easy Insight</h3>
					<p class="text-base-content/70">Single view dashboard for all your connections.</p>
				</div>
			</div>

			<div class="card bg-base-100 feature-card shadow-xl">
				<figure class="px-10 pt-10">
					<div
						class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500"
					>
						<svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
							></path>
						</svg>
					</div>
				</figure>
				<div class="card-body items-center text-center">
					<h3 class="card-title text-2xl">User Friendly</h3>
					<p class="text-base-content/70">Everything you need, nothing you don't.</p>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	@keyframes float {
		0%,
		100% {
			transform: translateY(0px);
		}
		50% {
			transform: translateY(-20px);
		}
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes pulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.05);
		}
	}

	.animate-float {
		animation: float 6s ease-in-out infinite;
	}

	.animate-fade-in-up {
		animation: fadeInUp 0.8s ease-out forwards;
	}

	.animate-pulse-slow {
		animation: pulse 3s ease-in-out infinite;
	}

	.gradient-text {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		color: transparent;
		display: inline-block;
	}

	.hero::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
			repeat;
		animation: float 20s linear infinite;
		pointer-events: none;
	}

	.feature-card {
		transition: all 0.3s ease;
		opacity: 1;
		transform: translateY(0);
	}

	.feature-card:hover {
		transform: translateY(-5px);
		transition: all 0.3s ease;
	}
</style>
