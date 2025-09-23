<script lang="ts">
	// Skeleton component for friend requests section loading state
</script>

<div class="card bg-base-200">
	<div class="card-body">
		<h2 class="card-title">Friend Requests</h2>

		<!-- Friend request form skeleton -->
		<div class="join mb-4 w-full">
			<div class="w-full">
				<div class="skeleton h-12 w-full"></div>
			</div>
			<div class="skeleton h-12 w-40"></div>
		</div>

		<!-- Friend requests list skeleton -->
		<div class="space-y-2">
			{#each Array.from({ length: 2 }, (_, i) => i) as i (i)}
				<div class="bg-base-300 rounded-box p-2">
					<div class="flex items-center justify-between">
						<div class="skeleton h-4 w-48"></div>
						<div class="join">
							<div class="skeleton h-8 w-8"></div>
							<div class="skeleton h-8 w-8"></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
