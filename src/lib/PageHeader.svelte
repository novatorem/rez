<script lang="ts">
	import { page } from '$app/stores';
	import { AppBar } from '@skeletonlabs/skeleton';
	import { LightSwitch } from '@skeletonlabs/skeleton';
	import { popup } from '@skeletonlabs/skeleton';
	import type { PopupSettings } from '@skeletonlabs/skeleton';

	const popupClick: PopupSettings = {
		event: 'click',
		target: 'popupClick',
		placement: 'top'
	};

	$: classesActive = (href: string) =>
		href === $page.url.pathname ? 'btn variant-filled' : 'btn ';
</script>

<AppBar>
	<svelte:fragment slot="lead"><a href="/">❤️‍🩹 rez</a></svelte:fragment>

	<svelte:fragment slot="trail"
		><button class="btn variant-filled" use:popup={popupClick}>🔘</button></svelte:fragment
	>
</AppBar>

<div class="card p-4" data-popup="popupClick">
	<nav class="list-nav">
		<ul>
			<li>
				<span class="badge"> <LightSwitch /></span>
			</li>
			<li>
				<a href="/account" data-sveltekit-preload-data="hover" class={classesActive('/account')}>
					<span class="badge">👤</span>
				</a>
			</li>
		</ul>
	</nav>
	<div class="arrow" />
</div>
