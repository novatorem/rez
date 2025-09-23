<script>
	import { resolve } from '$app/paths';
</script>

<!-- Hero Section -->
<div class="hero from-primary to-secondary text-primary-content min-h-screen bg-gradient-to-br">
	<div class="hero-overlay bg-opacity-60"></div>
	<div class="hero-content text-center">
		<div class="animate-fade-in-up max-w-md">
			<h1 class="relative mb-5 text-5xl font-bold md:text-7xl">
				<div class="grid">
					<span
						class="pointer-events-none col-start-1 row-start-1 [transform:translate3d(0,0,0)] bg-[linear-gradient(90deg,var(--color-secondary)_4%,color-mix(in_oklch,var(--color-secondary),var(--color-error))_22%,var(--color-primary)_45%,color-mix(in_oklch,var(--color-primary),var(--color-accent))_67%,var(--color-accent)_100.2%)] bg-clip-text opacity-70 blur-xl [-webkit-text-fill-color:transparent] [:root[dir=rtl]_&]:leading-[1.35]"
						aria-hidden="true">Rezonate</span
					>
					<span class="relative z-10 col-start-1 row-start-1">Rezonate</span>
				</div>
				<span class="mt-2 block text-3xl font-normal md:text-4xl">with others</span>
			</h1>
			<p class="mb-5 text-xl md:text-2xl">
				Connect to people. Stay up to date. Always in the know.
			</p>
			<div class="flex flex-col gap-4 sm:flex-row sm:justify-center">
				<a href={resolve('/dashboard')} class="btn btn-accent btn-lg" aria-label="Go to dashboard">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
						><path
							fill="currentColor"
							d="M16.434 8.596c1.152 0 2.237.449 3.053 1.264c.815.816 1.266 1.9 1.266 3.056s-.45 2.239-1.268 3.056c-.813.815-1.898 1.266-3.053 1.266s-2.238-.449-3.055-1.266l-1.376-1.32l-1.395 1.338a4.27 4.27 0 0 1-3.036 1.248a4.28 4.28 0 0 1-3.054-1.267c-.815-.813-1.265-1.899-1.265-3.053s.45-2.237 1.267-3.056a4.3 4.3 0 0 1 3.053-1.266c1.154 0 2.239.449 3.055 1.266l1.375 1.32l1.396-1.34a4.28 4.28 0 0 1 3.037-1.246m0-2c-1.679 0-3.25.645-4.433 1.813a6.25 6.25 0 0 0-4.43-1.813a6.27 6.27 0 0 0-4.467 1.853c-1.194 1.192-1.852 2.78-1.852 4.469s.658 3.274 1.852 4.468a6.28 6.28 0 0 0 4.468 1.852a6.25 6.25 0 0 0 4.431-1.814a6.25 6.25 0 0 0 4.431 1.814a6.27 6.27 0 0 0 4.469-1.854a6.26 6.26 0 0 0 1.852-4.467a6.3 6.3 0 0 0-1.852-4.47a6.28 6.28 0 0 0-4.469-1.851m-8.863 5.5c.225 0 .426.088.612.271l.57.548l-.603.579a.8.8 0 0 1-.578.223a.82.82 0 0 1-.58-.223a.8.8 0 0 1-.24-.578c0-.221.084-.422.243-.581a.8.8 0 0 1 .576-.239m0-1c-.486 0-.942.189-1.285.533a1.8 1.8 0 0 0-.535 1.287c0 .484.189.941.533 1.285s.815.516 1.287.516a1.8 1.8 0 0 0 1.285-.516l1.339-1.285l-1.321-1.27a1.82 1.82 0 0 0-1.303-.55m8.863 1.017a.8.8 0 0 1 .576.219c.158.159.242.359.242.582s-.083.422-.243.581a.8.8 0 0 1-.571.228a.86.86 0 0 1-.617-.261l-.571-.548l.603-.578a.8.8 0 0 1 .581-.223m0-1c-.472 0-.943.172-1.287.516l-1.34 1.285l1.322 1.27a1.85 1.85 0 0 0 1.311.539a1.8 1.8 0 0 0 1.813-1.808a1.8 1.8 0 0 0-.532-1.287a1.82 1.82 0 0 0-1.287-.515"
						/></svg
					>
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

	.animate-float {
		animation: float 6s ease-in-out infinite;
	}

	.animate-fade-in-up {
		animation: fadeInUp 0.8s ease-out forwards;
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
</style>
