<div class="bg-base-200 flex min-h-screen items-center justify-center p-4">
	<div class="card bg-base-100 w-full max-w-md shadow-xl">
		<div class="card-body">
			<h2 class="card-title mb-6 justify-center text-2xl">Welcome!</h2>

			<form method="POST" action="?/login" class="space-y-4">
				<div class="form-control">
					<label class="label" for="email-input">
						<span class="label-text">Email</span>
					</label>
					<input
						id="email-input"
						name="email"
						type="email"
						placeholder="your@email.com"
						required
						class="input input-bordered w-full"
					/>
				</div>

				<div class="form-control">
					<label class="label" for="password-input">
						<span class="label-text">Password</span>
					</label>
					<input
						id="password-input"
						name="password"
						type="password"
						placeholder="••••••••"
						required
						class="input input-bordered w-full"
					/>
				</div>

				<div class="form-control mt-6 space-y-2">
					<button type="submit" class="btn btn-primary w-full"> Login </button>

					<div class="divider my-1 text-sm">OR</div>

					<button
						formaction="?/signup"
						formmethod="POST"
						class="btn btn-outline btn-secondary w-full"
					>
						Sign Up
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
