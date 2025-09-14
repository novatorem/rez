<script lang="ts">
	let { itemCount = 3, showActions = true } = $props<{
		itemCount?: number;
		showActions?: boolean;
	}>();
</script>

<div class="space-y-2">
	{#each Array.from({ length: itemCount }, (_, i) => i) as index (index)}
		<div class="bg-base-300 rounded-box p-2">
			<div class="flex items-center justify-between">
				<div class="flex flex-1 flex-col space-y-2">
					<div class="skeleton h-4 w-32"></div>
					<div class="skeleton h-3 w-48"></div>
				</div>
				{#if showActions}
					<div class="skeleton h-8 w-16"></div>
				{/if}
			</div>
		</div>
	{/each}
</div>
