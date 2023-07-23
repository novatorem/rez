<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton';
	import { FileDropzone } from '@skeletonlabs/skeleton';

	import type { SupabaseClient } from '@supabase/supabase-js';
	import { createEventDispatcher } from 'svelte';

	export let url: string;
	export let supabase: SupabaseClient;

	let avatarUrl: string | null = null;
	let uploading = false;
	let files: FileList;

	const dispatch = createEventDispatcher();

	const downloadImage = async (path: string) => {
		try {
			const { data, error } = await supabase.storage.from('avatars').download(path);

			if (error) {
				throw error;
			}

			const url = URL.createObjectURL(data);
			avatarUrl = url;
		} catch (error) {
			if (error instanceof Error) {
				console.log('Error downloading image: ', error.message);
			}
		}
	};

	const uploadAvatar = async () => {
		try {
			uploading = true;

			if (!files || files.length === 0) {
				throw new Error('You must select an image to upload.');
			}

			const file = files[0];
			const fileExt = file.name.split('.').pop();
			const filePath = `${Math.random()}.${fileExt}`;

			let { error } = await supabase.storage.from('avatars').upload(filePath, file);

			if (error) {
				throw error;
			}

			url = filePath;
			setTimeout(() => {
				dispatch('upload');
			}, 100);
		} catch (error) {
			if (error instanceof Error) {
				alert(error.message);
			}
		} finally {
			uploading = false;
		}
	};

	$: if (url) downloadImage(url);
</script>

<div>
	{#if avatarUrl}
		<input type="hidden" name="avatarUrl" value={url} />
		<FileDropzone
			name="files"
			type="file"
			id="single"
			accept="image/*"
			bind:files
			on:change={uploadAvatar}
			disabled={uploading}
		>
			<svelte:fragment slot="lead">
				<Avatar
					src={avatarUrl}
					width="w-32"
					rounded="rounded-3xl"
					name="files"
					type="file"
					id="single"
					accept="image/*"
					bind:files
					on:change={uploadAvatar}
					disabled={uploading}
				/></svelte:fragment
			>
			<svelte:fragment slot="message"
				>{uploading ? 'Uploading ...' : 'Profile Picture'}</svelte:fragment
			>
			<svelte:fragment slot="meta">Replace image</svelte:fragment>
		</FileDropzone>
	{:else}
		<input type="hidden" name="avatarUrl" value={url} />
		<FileDropzone
			name="files"
			type="file"
			id="single"
			accept="image/*"
			bind:files
			on:change={uploadAvatar}
			disabled={uploading}
		>
			<svelte:fragment slot="lead">
				<Avatar
					class="placeholder w-32 h-32"
					rounded="rounded-3xl"
					name="files"
					type="file"
					id="single"
					initials=""
					accept="image/*"
					bind:files
					on:change={uploadAvatar}
					disabled={uploading}
				/></svelte:fragment
			>
			<svelte:fragment slot="message"
				>{uploading ? 'Uploading ...' : 'Profile Picture'}</svelte:fragment
			>
			<svelte:fragment slot="meta">Replace image</svelte:fragment>
		</FileDropzone>
	{/if}
</div>
