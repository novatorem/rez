<script lang="ts">
	import { DashboardDataLoader, type DashboardData } from '$lib/dashboard-data-loader';
	import {
		checkUsernameAvailability,
		ERROR_MESSAGES,
		handleDatabaseError,
		MAX_USERNAME_LENGTH,
		validateUsername
	} from '$lib/dashboard-utils';
	import { themes } from '$lib/themes';
	import { toastStore } from '$lib/toast-store';
	import { onMount } from 'svelte';
	import { themeChange } from 'theme-change';

	let { data } = $props();
	let { session, supabase } = $derived(data);

	let currentTheme = $state('light');
	let isLoading = $state(false);

	// Username functionality
	let dashboardData = $state<DashboardData | null>(null);
	let isLoadingData = $state(true);
	let currentUsername = $derived(dashboardData?.currentUsername || '');
	let usernameText = $derived(currentUsername || '');
	let isUpdatingUsername = $state(false);
	let usernameCharacterCount = $derived(usernameText.length);

	// Load current theme and dashboard data on mount
	onMount(() => {
		const savedTheme = localStorage.getItem('theme') || 'light';
		currentTheme = savedTheme;
		themeChange(false);

		if (session?.user && supabase) {
			loadDashboardData();
		}
	});

	// Load dashboard data
	const loadDashboardData = async () => {
		if (!session?.user || !supabase) return;

		isLoadingData = true;
		try {
			const dataLoader = new DashboardDataLoader(supabase, session.user.id);
			dashboardData = await dataLoader.loadAllData();
		} catch (error) {
			handleDatabaseError(error, 'load dashboard data');
		} finally {
			isLoadingData = false;
		}
	};

	const updateTheme = async (theme: string) => {
		isLoading = true;
		try {
			currentTheme = theme;
			localStorage.setItem('theme', theme);
			// Set cookie for persistence across sessions
			const oneYear = 60 * 60 * 24 * 365;
			document.cookie = `theme=${theme}; max-age=${oneYear}; path=/; SameSite=Lax`;
			document.documentElement.setAttribute('data-theme', theme);
			themeChange(false);
			toastStore.success(`Theme changed to ${theme.charAt(0).toUpperCase() + theme.slice(1)}`);
		} catch {
			toastStore.error('Failed to update theme');
		} finally {
			isLoading = false;
		}
	};

	const exportData = () => {
		// Placeholder for data export functionality
		toastStore.info('Data export feature coming soon!');
	};

	const deleteAccount = () => {
		// Placeholder for account deletion functionality
		toastStore.info('Account deletion feature coming soon!');
	};

	const handleUsernameUpdate = async (evt: Event) => {
		evt.preventDefault();
		if (!session?.user || !supabase) return;

		const validationError = validateUsername(usernameText);
		if (validationError) {
			toastStore.error(validationError);
			return;
		}

		isUpdatingUsername = true;
		try {
			// Check if username is available
			const isAvailable = await checkUsernameAvailability(supabase, usernameText, session.user.id);
			if (!isAvailable) {
				toastStore.error(ERROR_MESSAGES.USERNAME_TAKEN);
				return;
			}

			// Update username
			const { error } = await supabase
				.from('users')
				.update({ username: usernameText })
				.eq('id', session.user.id);

			if (error) {
				handleDatabaseError(error, 'update username');
				return;
			}

			await loadDashboardData();
			toastStore.success('Username updated successfully');
		} catch (error) {
			handleDatabaseError(error, 'update username');
		} finally {
			isUpdatingUsername = false;
		}
	};
</script>

<svelte:head>
	<title>Settings - Rez</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<div class="mb-8">
		<h1 class="text-base-content mb-2 text-3xl font-bold">Settings</h1>
		<p class="text-base-content/70">Manage your account preferences and application settings.</p>
	</div>

	<div class="space-y-8">
		<!-- Profile Section -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title mb-4 text-xl">Profile</h2>
				<div class="space-y-4">
					<div class="form-control">
						<label class="label" for="email-input">
							<span class="label-text">Email</span>
						</label>
						<input
							id="email-input"
							type="email"
							value={session?.user?.email || ''}
							class="input input-bordered w-full"
							disabled
						/>
						<div class="label">
							<span class="label-text-alt">Email cannot be changed</span>
						</div>
					</div>
					<div class="form-control">
						<label class="label" for="user-id-input">
							<span class="label-text">User ID</span>
						</label>
						<input
							id="user-id-input"
							type="text"
							value={session?.user?.id || ''}
							class="input input-bordered w-full font-mono text-sm"
							disabled
						/>
					</div>

					<!-- Username Section -->
					{#if isLoadingData}
						<div class="form-control">
							<div class="skeleton h-12 w-full"></div>
						</div>
					{:else}
						<div class="form-control">
							{#if currentUsername}
								<div class="bg-base-200 mb-4 rounded-lg p-3">
									<p class="text-lg">Current username: @{currentUsername}</p>
								</div>
							{/if}

							<form onsubmit={handleUsernameUpdate}>
								<label class="label" for="username-input">
									<span class="label-text">{currentUsername ? 'Update' : 'Set'} your username</span>
									<span
										class="text-sm {usernameCharacterCount > MAX_USERNAME_LENGTH
											? 'text-error'
											: ''}"
									>
										{usernameCharacterCount}/{MAX_USERNAME_LENGTH}
									</span>
								</label>
								<div class="input">
									<span>@</span>
									<input
										id="username-input"
										bind:value={usernameText}
										type="text"
										class="validator"
										required
										placeholder="Username"
										pattern="[A-Za-z]([A-Za-z0-9]|[._-](?![._-]))*"
										minlength="3"
										maxlength={MAX_USERNAME_LENGTH}
										title="Only letters, numbers, dots, dashes, or underscores"
									/>
								</div>
								<div class="label">
									<span class="label-text-alt">
										Must be 3 to {MAX_USERNAME_LENGTH} characters
										<br />containing only letters, numbers, dots, dashes, or underscores
										<br />No consecutive special characters
									</span>
								</div>
								<button class="btn btn-primary mt-2" disabled={isUpdatingUsername}>
									{#if isUpdatingUsername}
										<span class="loading loading-spinner loading-sm"></span>
										Updating...
									{:else}
										{currentUsername ? 'Update Username' : 'Set Username'}
									{/if}
								</button>
							</form>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Appearance Section -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title mb-4 text-xl">Appearance</h2>
				<div class="space-y-4">
					<div class="form-control">
						<label class="label" for="theme-select">
							<span class="label-text">Theme</span>
						</label>
						<select
							id="theme-select"
							class="select select-bordered select-primary w-full text-lg capitalize"
							bind:value={currentTheme}
							onchange={(e) => updateTheme((e.target as HTMLSelectElement).value)}
							disabled={isLoading}
						>
							<option value="" disabled={currentTheme !== ''}>Choose a theme</option>
							{#each themes as theme (theme)}
								<option value={theme} class="capitalize">{theme}</option>
							{/each}
						</select>
						<div class="label">
							<span class="label-text-alt">Choose your preferred theme</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Data Management Section -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title mb-4 text-xl">Data Management</h2>
				<div class="space-y-4">
					<div class="form-control">
						<button class="btn btn-outline btn-primary" onclick={exportData}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="mr-2 h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
							Export Data
						</button>
						<div class="label">
							<span class="label-text-alt">Download your data in JSON format</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Danger Zone Section -->
		<div class="card bg-base-100 border-error shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-error mb-4 text-xl">Danger Zone</h2>
				<div class="space-y-4">
					<div class="form-control">
						<button class="btn btn-error btn-outline" onclick={deleteAccount}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="mr-2 h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
							Delete Account
						</button>
						<div class="label">
							<span class="label-text-alt text-error"
								>Permanently delete your account and all data</span
							>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
