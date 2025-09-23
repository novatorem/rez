<script>
	import { resolve } from '$app/paths';
</script>

<div class="bg-base-200 flex min-h-screen items-center justify-center p-4">
	<div class="card bg-base-100 w-full max-w-md shadow-xl">
		<div class="card-body">
			<div class="card-title text-error mb-2 justify-center text-2xl">Authentication Error</div>

			<div class="alert alert-error mb-4">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6 shrink-0 stroke-current"
					fill="none"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<span>We couldn't sign you in. Please try again.</span>
			</div>

			<p class="mb-4 text-center">
				There was a problem with your sign-in attempt. This could be due to:
			</p>

			<ul class="mb-6 list-inside list-disc">
				<li>Incorrect email or password</li>
				<li>Your account may not exist</li>
				<li>A temporary connection issue</li>
			</ul>

			<div class="card-actions justify-center">
				<a href={resolve('/auth')} class="btn btn-primary">Back to Login</a>
				<a href={resolve('/')} class="btn btn-ghost">Home</a>
			</div>
		</div>
	</div>
</div>
