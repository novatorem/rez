<script lang="ts">
	let { data } = $props();
	let { colors } = $derived(data);
</script>

<a href="/dashboard" class="btn btn-primary">Dashboard</a>
<ul>
	{#each colors as color}
		<li>{color.name}</li>
	{/each}
</ul>
