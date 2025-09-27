<script lang="ts">
	import { DashboardDataLoader, type DashboardData } from '$lib/dashboard-data-loader';
	import {
		checkUsernameAvailability,
		ERROR_MESSAGES,
		handleDatabaseError,
		MAX_DISPLAY_NAME_LENGTH,
		MAX_USERNAME_LENGTH,
		sanitizeDisplayName,
		validateDisplayName,
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
	let currentDisplayName = $derived(dashboardData?.currentDisplayName || null);
	let usernameText = $derived(currentUsername || '');
	let displayNameText = $derived(currentDisplayName || '');
	let isUpdatingUsername = $state(false);
	let isUpdatingDisplayName = $state(false);
	let usernameCharacterCount = $derived(usernameText.length);
	let displayNameCharacterCount = $derived(displayNameText.length);

	// Delete account modal functionality
	let showDeleteModal = $state(false);
	let deletePassword = $state('');
	let isDeletingAccount = $state(false);

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

	const exportData = async () => {
		if (!session?.user || !supabase) {
			toastStore.error('Unable to export data: User not authenticated');
			return;
		}

		try {
			isLoading = true;
			toastStore.info('Preparing your data export...');

			const dataLoader = new DashboardDataLoader(supabase, session.user.id);
			const exportData = await dataLoader.exportUserData();

			// Create a formatted JSON string
			const jsonString = JSON.stringify(exportData, null, 2);

			// Create a blob and download it
			const blob = new Blob([jsonString], { type: 'application/json' });
			const url = URL.createObjectURL(blob);

			// Create a temporary download link
			const link = document.createElement('a');
			link.href = url;
			link.download = `rez-data-export-${new Date().toISOString().split('T')[0]}.json`;

			// Trigger the download
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			// Clean up the URL object
			URL.revokeObjectURL(url);

			toastStore.success('Data exported successfully!');
		} catch (error) {
			console.error('Export error:', error);
			handleDatabaseError(error, 'export data');
		} finally {
			isLoading = false;
		}
	};

	const deleteAccount = () => {
		showDeleteModal = true;
	};

	const confirmDeleteAccount = async () => {
		if (!deletePassword.trim()) {
			toastStore.error('Please enter your password to confirm account deletion');
			return;
		}

		if (!session?.user || !supabase) {
			toastStore.error('Unable to delete account: User not authenticated');
			return;
		}

		isDeletingAccount = true;
		try {
			// Re-authenticate user with password
			const { error: authError } = await supabase.auth.signInWithPassword({
				email: session.user.email!,
				password: deletePassword
			});

			if (authError) {
				toastStore.error('Invalid password. Please try again.');
				return;
			}

			// Use the comprehensive delete function from DashboardDataLoader
			const dataLoader = new DashboardDataLoader(supabase, session.user.id);
			await dataLoader.deleteUserAccount();

			toastStore.success(
				'Account and all data deleted successfully. You will be redirected to the login page.'
			);

			// Sign out and redirect
			await supabase.auth.signOut();
			window.location.href = '/auth';
		} catch (error) {
			console.error('Delete account error:', error);
			handleDatabaseError(error, 'delete account');
		} finally {
			isDeletingAccount = false;
			showDeleteModal = false;
			deletePassword = '';
		}
	};

	const cancelDeleteAccount = () => {
		showDeleteModal = false;
		deletePassword = '';
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

	const handleDisplayNameUpdate = async (evt: Event) => {
		evt.preventDefault();
		if (!session?.user || !supabase) return;

		const sanitizedDisplayName = sanitizeDisplayName(displayNameText);
		const validationError = validateDisplayName(sanitizedDisplayName);
		if (validationError) {
			toastStore.error(validationError);
			return;
		}

		isUpdatingDisplayName = true;
		try {
			// Update display name (can be null if empty)
			const { error } = await supabase
				.from('users')
				.update({ display_name: sanitizedDisplayName || null })
				.eq('id', session.user.id);

			if (error) {
				handleDatabaseError(error, 'update display name');
				return;
			}

			await loadDashboardData();
			toastStore.success('Display name updated successfully');
		} catch (error) {
			handleDatabaseError(error, 'update display name');
		} finally {
			isUpdatingDisplayName = false;
		}
	};
</script>

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
									<p class="text-lg">Current username: {currentUsername}</p>
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
								<div class="join w-full">
									<div class="w-full">
										<label class="input validator join-item w-full">
											<svg
												class="h-[1em] opacity-50"
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
											>
												<g
													stroke-linejoin="round"
													stroke-linecap="round"
													stroke-width="2.5"
													fill="none"
													stroke="currentColor"
												>
													<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
													<circle cx="12" cy="7" r="4"></circle>
												</g>
											</svg>
											<input
												id="username-input"
												bind:value={usernameText}
												type="text"
												required
												placeholder="Username"
												pattern="[A-Za-z][A-Za-z0-9._\-]*"
												minlength="3"
												maxlength={MAX_USERNAME_LENGTH}
												title="Must start with a letter, then letters, numbers, dots, dashes, or underscores"
											/>
										</label>
									</div>
									<button class="btn btn-primary join-item" disabled={isUpdatingUsername}>
										{#if isUpdatingUsername}
											<span class="loading loading-spinner loading-sm"></span>
											Updating...
										{:else}
											{currentUsername ? 'Update Username' : 'Set Username'}
										{/if}
									</button>
								</div>
								<div class="label">
									<span class="label-text-alt">
										Must be:<br />- 3 to {MAX_USERNAME_LENGTH} characters<br />- Letters or numbers<br
										/>- Dots, dashes, or underscores
									</span>
								</div>
							</form>
						</div>
					{/if}

					<!-- Display Name Section -->
					{#if isLoadingData}
						<div class="form-control">
							<div class="skeleton h-12 w-full"></div>
						</div>
					{:else}
						<div class="form-control">
							{#if currentDisplayName}
								<div class="bg-base-200 mb-4 rounded-lg p-3">
									<p class="text-lg">Current display name: {currentDisplayName}</p>
								</div>
							{/if}

							<form onsubmit={handleDisplayNameUpdate}>
								<label class="label" for="display-name-input">
									<span class="label-text"
										>{currentDisplayName ? 'Update' : 'Set'} your display name</span
									>
									<span
										class="text-sm {displayNameCharacterCount > MAX_DISPLAY_NAME_LENGTH
											? 'text-error'
											: ''}"
									>
										{displayNameCharacterCount}/{MAX_DISPLAY_NAME_LENGTH}
									</span>
								</label>
								<div class="join w-full">
									<div class="w-full">
										<label class="input validator join-item w-full">
											<svg
												class="h-[1em] opacity-50"
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
											>
												<g
													stroke-linejoin="round"
													stroke-linecap="round"
													stroke-width="2.5"
													fill="none"
													stroke="currentColor"
												>
													<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
													<circle cx="12" cy="7" r="4"></circle>
												</g>
											</svg>
											<input
												id="display-name-input"
												bind:value={displayNameText}
												type="text"
												placeholder="Display name (optional)"
												maxlength={MAX_DISPLAY_NAME_LENGTH}
												title="A friendly name shown to other users"
											/>
										</label>
									</div>
									<button class="btn btn-primary join-item" disabled={isUpdatingDisplayName}>
										{#if isUpdatingDisplayName}
											<span class="loading loading-spinner loading-sm"></span>
											Updating...
										{:else}
											{currentDisplayName ? 'Update Display Name' : 'Set Display Name'}
										{/if}
									</button>
								</div>
								<div class="label">
									<span class="label-text-alt">
										Optional friendly name shown to other users<br />- Up to {MAX_DISPLAY_NAME_LENGTH}
										characters<br />- Leave empty to use username
									</span>
								</div>
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
							class="select select-bordered select-primary select-lg w-full text-lg capitalize"
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
						<button class="btn btn-outline btn-primary" onclick={exportData} disabled={isLoading}>
							{#if isLoading}
								<span class="loading loading-spinner loading-sm mr-2"></span>
								Exporting...
							{:else}
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
							{/if}
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

<!-- Delete Account Confirmation Modal -->
{#if showDeleteModal}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-error text-lg font-bold">Delete Account</h3>
			<p class="py-4">
				This action cannot be undone. This will permanently delete your account and remove all data
				from our servers.
			</p>
			<div class="form-control">
				<label class="label" for="delete-password">
					<span class="label-text">Enter your password to confirm</span>
				</label>
				<input
					id="delete-password"
					type="password"
					bind:value={deletePassword}
					class="input input-bordered w-full"
					placeholder="Your password"
					disabled={isDeletingAccount}
				/>
			</div>
			<div class="modal-action">
				<button class="btn btn-ghost" onclick={cancelDeleteAccount} disabled={isDeletingAccount}>
					Cancel
				</button>
				<button
					class="btn btn-error"
					onclick={confirmDeleteAccount}
					disabled={isDeletingAccount || !deletePassword.trim()}
				>
					{#if isDeletingAccount}
						<span class="loading loading-spinner loading-sm mr-2"></span>
						Deleting...
					{:else}
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
					{/if}
				</button>
			</div>
		</div>
		<button
			type="button"
			class="modal-backdrop"
			onclick={cancelDeleteAccount}
			onkeydown={(e) => e.key === 'Escape' && cancelDeleteAccount()}
			aria-label="Close modal"
		></button>
	</div>
{/if}
