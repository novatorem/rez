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
	import ThemeSelect from '$lib/theme-select.svelte';
	import { toastStore } from '$lib/toast-store';
	import { onMount } from 'svelte';

	let { data } = $props();
	let { session, supabase } = $derived(data);

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

	// Load dashboard data on mount
	onMount(() => {
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

<div class="container mx-auto max-w-4xl px-4 py-8 sm:px-6">
	<!-- Header Section -->
	<header class="mb-12">
		<h1 class="text-base-content mb-3 text-4xl font-bold">Settings</h1>
		<p class="text-base-content/70 text-lg">
			Manage your account preferences and application settings.
		</p>
	</header>

	<!-- Main Settings Container -->
	<main class="space-y-12">
		<!-- Profile Section -->
		<section class="card bg-base-100 shadow-xl" aria-labelledby="profile-heading">
			<div class="card-body p-6 sm:p-8">
				<h2 id="profile-heading" class="card-title mb-6 flex items-center gap-3 text-2xl">
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						/>
					</svg>
					Profile Information
				</h2>
				<div class="space-y-8">
					<!-- Account Information Subsection -->
					<div class="space-y-6">
						<h3 class="text-base-content/80 border-base-300 border-b pb-2 text-lg font-semibold">
							Account Information
						</h3>

						<div class="form-control min-w-0">
							<label class="label" for="email-input">
								<span class="label-text font-medium">Email Address</span>
							</label>
							<input
								id="email-input"
								type="email"
								value={session?.user?.email || ''}
								class="input input-bordered w-full"
								disabled
								aria-describedby="email-help"
							/>
						</div>

						<div class="form-control min-w-0">
							<label class="label" for="user-id-input">
								<span class="label-text font-medium">User ID</span>
							</label>
							<input
								id="user-id-input"
								type="text"
								value={session?.user?.id || ''}
								class="input input-bordered w-full font-mono text-sm"
								disabled
								aria-describedby="user-id-help"
							/>
						</div>
					</div>

					<!-- Username Subsection -->
					<div class="space-y-6">
						<h3 class="text-base-content/80 border-base-300 border-b pb-2 text-lg font-semibold">
							Username
						</h3>

						{#if isLoadingData}
							<div class="form-control min-w-0">
								<div class="skeleton h-12 w-full"></div>
							</div>
						{:else}
							<div class="space-y-4">
								{#if currentUsername}
									<div class="bg-base-200 border-base-300 rounded-lg border p-4">
										<p class="text-base-content text-lg font-medium">
											Current username: <span class="text-primary font-mono">{currentUsername}</span
											>
										</p>
									</div>
								{/if}

								<form onsubmit={handleUsernameUpdate} class="space-y-4">
									<div class="form-control min-w-0">
										<label class="label" for="username-input">
											<span class="label-text font-medium"
												>{currentUsername ? 'Update' : 'Set'} your username</span
											>
											<span
												class="font-mono text-sm {usernameCharacterCount > MAX_USERNAME_LENGTH
													? 'text-error'
													: 'text-base-content/60'}"
											>
												{usernameCharacterCount}/{MAX_USERNAME_LENGTH}
											</span>
										</label>
										<div class="join w-full min-w-0">
											<div class="w-full">
												<label class="input validator join-item w-full">
													<svg
														class="h-[1em] opacity-50"
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 24 24"
														aria-hidden="true"
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
														placeholder="Enter your username"
														pattern="[A-Za-z][A-Za-z0-9._\-]*"
														minlength="3"
														maxlength={MAX_USERNAME_LENGTH}
														aria-describedby="username-help"
													/>
												</label>
											</div>
											<button
												class="btn btn-primary join-item"
												disabled={isUpdatingUsername}
												type="submit"
												aria-describedby="username-help"
											>
												{#if isUpdatingUsername}
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="24"
														height="24"
														viewBox="0 0 24 24"
														><circle cx="18" cy="12" r="0" fill="currentColor"
															><animate
																attributeName="r"
																begin=".67"
																calcMode="spline"
																dur="1.5s"
																keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
																repeatCount="indefinite"
																values="0;2;0;0"
															/></circle
														><circle cx="12" cy="12" r="0" fill="currentColor"
															><animate
																attributeName="r"
																begin=".33"
																calcMode="spline"
																dur="1.5s"
																keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
																repeatCount="indefinite"
																values="0;2;0;0"
															/></circle
														><circle cx="6" cy="12" r="0" fill="currentColor"
															><animate
																attributeName="r"
																begin="0"
																calcMode="spline"
																dur="1.5s"
																keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
																repeatCount="indefinite"
																values="0;2;0;0"
															/></circle
														></svg
													>
												{:else}
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="24"
														height="24"
														viewBox="0 0 24 24"
														><g
															fill="none"
															stroke="currentColor"
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															><path
																fill="currentColor"
																fill-opacity="0"
																stroke-dasharray="20"
																stroke-dashoffset="20"
																d="M12 15h2v-6h2.5l-4.5 -4.5M12 15h-2v-6h-2.5l4.5 -4.5"
																><animate
																	fill="freeze"
																	attributeName="fill-opacity"
																	begin="0.7s"
																	dur="0.5s"
																	values="0;1"
																/><animate
																	fill="freeze"
																	attributeName="stroke-dashoffset"
																	dur="0.4s"
																	values="20;0"
																/></path
															><path stroke-dasharray="14" stroke-dashoffset="14" d="M6 19h12"
																><animate
																	fill="freeze"
																	attributeName="stroke-dashoffset"
																	begin="0.5s"
																	dur="0.2s"
																	values="14;0"
																/></path
															></g
														></svg
													>
												{/if}
											</button>
										</div>
										<div class="label w-full max-w-full">
											<span
												id="username-help"
												class="label-text-alt text-base-content/60 break-anywhere block w-full max-w-full text-sm leading-relaxed break-words hyphens-auto whitespace-normal sm:text-base"
											>
												Must be 3 to {MAX_USERNAME_LENGTH} characters, start with a letter, and contain
												only letters, numbers, dots, dashes, or underscores
											</span>
										</div>
									</div>
								</form>
							</div>
						{/if}
					</div>

					<!-- Display Name Subsection -->
					<div class="space-y-6">
						<h3 class="text-base-content/80 border-base-300 border-b pb-2 text-lg font-semibold">
							Display Name
						</h3>

						{#if isLoadingData}
							<div class="form-control min-w-0">
								<div class="skeleton h-12 w-full"></div>
							</div>
						{:else}
							<div class="space-y-4">
								{#if currentDisplayName}
									<div class="bg-base-200 border-base-300 rounded-lg border p-4">
										<p class="text-base-content text-lg font-medium">
											Current display name: <span class="text-primary">{currentDisplayName}</span>
										</p>
									</div>
								{/if}

								<form onsubmit={handleDisplayNameUpdate} class="space-y-4">
									<div class="form-control min-w-0">
										<label class="label" for="display-name-input">
											<span class="label-text font-medium"
												>{currentDisplayName ? 'Update' : 'Set'} your display name</span
											>
											<span
												class="font-mono text-sm {displayNameCharacterCount >
												MAX_DISPLAY_NAME_LENGTH
													? 'text-error'
													: 'text-base-content/60'}"
											>
												{displayNameCharacterCount}/{MAX_DISPLAY_NAME_LENGTH}
											</span>
										</label>
										<div class="join w-full min-w-0">
											<div class="w-full">
												<label class="input validator join-item w-full">
													<svg
														class="h-[1em] opacity-50"
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 24 24"
														aria-hidden="true"
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
														placeholder="Enter your display name (optional)"
														maxlength={MAX_DISPLAY_NAME_LENGTH}
														aria-describedby="display-name-help"
													/>
												</label>
											</div>
											<button
												class="btn btn-primary join-item"
												disabled={isUpdatingDisplayName}
												type="submit"
												aria-describedby="display-name-help"
											>
												{#if isUpdatingDisplayName}
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="24"
														height="24"
														viewBox="0 0 24 24"
														><circle cx="18" cy="12" r="0" fill="currentColor"
															><animate
																attributeName="r"
																begin=".67"
																calcMode="spline"
																dur="1.5s"
																keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
																repeatCount="indefinite"
																values="0;2;0;0"
															/></circle
														><circle cx="12" cy="12" r="0" fill="currentColor"
															><animate
																attributeName="r"
																begin=".33"
																calcMode="spline"
																dur="1.5s"
																keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
																repeatCount="indefinite"
																values="0;2;0;0"
															/></circle
														><circle cx="6" cy="12" r="0" fill="currentColor"
															><animate
																attributeName="r"
																begin="0"
																calcMode="spline"
																dur="1.5s"
																keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8"
																repeatCount="indefinite"
																values="0;2;0;0"
															/></circle
														></svg
													>
												{:else}
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="24"
														height="24"
														viewBox="0 0 24 24"
														><g
															fill="none"
															stroke="currentColor"
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															><path
																fill="currentColor"
																fill-opacity="0"
																stroke-dasharray="20"
																stroke-dashoffset="20"
																d="M12 15h2v-6h2.5l-4.5 -4.5M12 15h-2v-6h-2.5l4.5 -4.5"
																><animate
																	fill="freeze"
																	attributeName="fill-opacity"
																	begin="0.7s"
																	dur="0.5s"
																	values="0;1"
																/><animate
																	fill="freeze"
																	attributeName="stroke-dashoffset"
																	dur="0.4s"
																	values="20;0"
																/></path
															><path stroke-dasharray="14" stroke-dashoffset="14" d="M6 19h12"
																><animate
																	fill="freeze"
																	attributeName="stroke-dashoffset"
																	begin="0.5s"
																	dur="0.2s"
																	values="14;0"
																/></path
															></g
														></svg
													>
												{/if}
											</button>
										</div>
										<div class="label w-full max-w-full">
											<span
												id="display-name-help"
												class="label-text-alt text-base-content/60 break-anywhere block w-full max-w-full text-sm leading-relaxed break-words hyphens-auto whitespace-normal sm:text-base"
											>
												Optional friendly name shown to other users. Up to {MAX_DISPLAY_NAME_LENGTH}
												characters. Leave empty to use username.
											</span>
										</div>
									</div>
								</form>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</section>

		<!-- Appearance Section -->
		<section class="card bg-base-100 shadow-xl" aria-labelledby="appearance-heading">
			<div class="card-body p-6 sm:p-8">
				<h2 id="appearance-heading" class="card-title mb-6 flex items-center gap-3 text-2xl">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
						><path
							fill="currentColor"
							d="M11 13.5v8H3v-8zm-2 2H5v4h4zM12 2l5.5 9h-11zm0 3.86L10.08 9h3.84zM17.5 13c2.5 0 4.5 2 4.5 4.5S20 22 17.5 22S13 20 13 17.5s2-4.5 4.5-4.5m0 2a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5"
						/></svg
					>
					Appearance
				</h2>
				<div class="space-y-6">
					<ThemeSelect />
				</div>
			</div>
		</section>

		<!-- Data Management Section -->
		<section class="card bg-base-100 shadow-xl" aria-labelledby="data-management-heading">
			<div class="card-body p-6 sm:p-8">
				<h2 id="data-management-heading" class="card-title mb-6 flex items-center gap-3 text-2xl">
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
						/>
					</svg>
					Data Management
				</h2>
				<div class="space-y-6">
					<div class="form-control min-w-0">
						<button
							class="btn btn-outline btn-primary btn-lg"
							onclick={exportData}
							disabled={isLoading}
							aria-describedby="export-help"
						>
							{#if isLoading}
								<span class="loading loading-spinner loading-sm mr-2" aria-hidden="true"></span>
								Exporting...
							{:else}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="mr-2 h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									aria-hidden="true"
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
						<div class="label w-full max-w-full">
							<span
								id="export-help"
								class="label-text-alt text-base-content/60 break-anywhere block w-full max-w-full text-sm leading-relaxed break-words hyphens-auto whitespace-normal sm:text-base"
								>Download your data in JSON format for backup or migration purposes</span
							>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Danger Zone Section -->
		<section class="card bg-base-100 border-error shadow-xl" aria-labelledby="danger-zone-heading">
			<div class="card-body p-6 sm:p-8">
				<h2
					id="danger-zone-heading"
					class="card-title text-error mb-6 flex items-center gap-3 text-2xl"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
						><path
							fill="currentColor"
							d="M2.725 21q-.275 0-.5-.137t-.35-.363t-.137-.488t.137-.512l9.25-16q.15-.25.388-.375T12 3t.488.125t.387.375l9.25 16q.15.25.138.513t-.138.487t-.35.363t-.5.137zM12 18q.425 0 .713-.288T13 17t-.288-.712T12 16t-.712.288T11 17t.288.713T12 18m0-3q.425 0 .713-.288T13 14v-3q0-.425-.288-.712T12 10t-.712.288T11 11v3q0 .425.288.713T12 15"
						/></svg
					>
					Danger Zone
				</h2>
				<div class="space-y-6">
					<div class="form-control min-w-0">
						<button
							class="btn btn-error btn-outline btn-lg"
							onclick={deleteAccount}
							aria-describedby="delete-account-help"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="mr-2 h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
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
						<div class="label w-full max-w-full">
							<span
								id="delete-account-help"
								class="label-text-alt text-error break-anywhere block w-full max-w-full text-sm leading-relaxed break-words hyphens-auto whitespace-normal sm:text-base"
							>
								Permanently delete your account and all associated data. This action cannot be
								undone.
							</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	</main>
</div>

<!-- Delete Account Confirmation Modal -->
{#if showDeleteModal}
	<div
		class="modal modal-open"
		role="dialog"
		aria-labelledby="delete-modal-title"
		aria-describedby="delete-modal-description"
	>
		<div class="modal-box max-w-md">
			<h3 id="delete-modal-title" class="text-error mb-4 flex items-center gap-2 text-xl font-bold">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
				Delete Account
			</h3>
			<p id="delete-modal-description" class="text-base-content/80 mb-6">
				This action cannot be undone. This will permanently delete your account and remove all data
				from our servers.
			</p>
			<div class="form-control mb-6">
				<label class="label" for="delete-password">
					<span class="label-text font-medium">Enter your password to confirm</span>
				</label>
				<input
					id="delete-password"
					type="password"
					bind:value={deletePassword}
					class="input input-bordered w-full"
					placeholder="Your password"
					disabled={isDeletingAccount}
					aria-describedby="delete-password-help"
				/>
				<div class="label w-full max-w-full">
					<span
						id="delete-password-help"
						class="label-text-alt text-error break-anywhere block w-full max-w-full text-sm leading-relaxed break-words hyphens-auto whitespace-normal sm:text-base"
					>
						This confirms you want to permanently delete your account
					</span>
				</div>
			</div>
			<div class="modal-action">
				<button
					class="btn btn-ghost"
					onclick={cancelDeleteAccount}
					disabled={isDeletingAccount}
					type="button"
				>
					Cancel
				</button>
				<button
					class="btn btn-error"
					onclick={confirmDeleteAccount}
					disabled={isDeletingAccount || !deletePassword.trim()}
					type="button"
				>
					{#if isDeletingAccount}
						<span class="loading loading-spinner loading-sm mr-2" aria-hidden="true"></span>
						Deleting...
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="mr-2 h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							aria-hidden="true"
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
