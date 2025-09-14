<script lang="ts">
	let {
		title,
		showContent = true,
		contentLines = 2
	} = $props<{
		title: string;
		showContent?: boolean;
		contentLines?: number;
	}>();
</script>

<div class="card bg-base-200">
	<div class="card-body">
		<div class="skeleton mb-4 h-6 w-32"></div>
		{#if title}
			<h2 class="card-title">{title}</h2>
		{/if}

		{#if showContent}
			<div class="space-y-2">
				{#each Array.from({ length: contentLines }, (_, i) => i) as i (i)}
					<div class="skeleton h-4 w-full"></div>
				{/each}
			</div>
		{/if}

		<div class="card-actions mt-4 justify-end">
			<div class="skeleton h-10 w-24"></div>
		</div>
	</div>
</div>
