<script lang="ts">
</script>

<div class="mb-4">
	<div class="card bg-base-200">
		<div class="card-body">
			<h2 class="card-title">My Friends</h2>
			<div class="space-y-3">
				{#each Array.from({ length: 3 }, (_, i) => i) as i (i)}
					<div class="bg-base-300 rounded-box p-4">
						<div class="flex w-full items-start gap-3">
							<div class="skeleton h-12 w-12 flex-shrink-0 rounded-full"></div>

							<div class="min-w-0 flex-1">
								<div
									class="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
								>
									<div class="min-w-0">
										<div class="skeleton mb-1 h-4 w-32"></div>
										<div class="skeleton h-3 w-24"></div>
									</div>
									<div class="skeleton h-8 w-8 flex-shrink-0"></div>
								</div>
								<div class="skeleton h-3 w-full max-w-xs"></div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
