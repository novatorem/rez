<script lang="ts">
	import ThemeSelect from '$lib/theme-select.svelte';
  let { data } = $props()
  let { colors } = $derived(data)
</script>

<ThemeSelect />

<h1>Welcome to Supabase!</h1>
<ul>
  {#each colors as color (color.id)}
    <li>{color.name}</li>
  {/each}
</ul>
