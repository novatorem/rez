<script lang='ts'>
	// The ordering of these imports is critical to your app working properly
	import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
	// If you have source.organizeImports set to true in VSCode, then it will auto change this ordering
	import '@skeletonlabs/skeleton/styles/skeleton.css';
	// Most of your app wide CSS should be put in this file
	import '../app.postcss';

	import { AppShell } from '@skeletonlabs/skeleton';
	import { invalidate } from '$app/navigation'
	import { onMount } from 'svelte'
  import Footer from '../lib/Footer.svelte';

  import PageHeader from '../lib/PageHeader.svelte';
	export let data



	let { supabase, session } = data
	$: ({ supabase, session } = data)

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((event, _session) => {
			if (_session?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth')
			}
		})

		return () => data.subscription.unsubscribe()
	})
</script>

<AppShell>
	<svelte:fragment slot="pageHeader">
		<PageHeader/>
	</svelte:fragment>
	<slot />
	<svelte:fragment slot="pageFooter"><Footer/></svelte:fragment>
</AppShell>
