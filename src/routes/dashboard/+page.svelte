<script lang="ts">
	import { DashboardDataLoader, type DashboardData } from '$lib/dashboard-data-loader';
	import {
		checkExistingFriendRequest,
		checkIncomingFriendRequest,
		ERROR_MESSAGES,
		findUserByUsername,
		getDisplayName,
		handleDatabaseError,
		MAX_STATUS_LENGTH,
		NotificationManager,
		requireAuth,
		sanitizeUsername,
		validateStatus,
		verifyFriendshipExists
	} from '$lib/dashboard-utils';
	import type { EventHandler } from 'svelte/elements';

	// Utility function to format datetime for display
	const formatStatusUpdatedAt = (updatedAt: string | null): string => {
		if (!updatedAt) return '';

		const date = new Date(updatedAt);
		const now = new Date();
		const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

		if (diffInMinutes < 1) return 'just now';
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

		const diffInHours = Math.floor(diffInMinutes / 60);
		if (diffInHours < 24) return `${diffInHours}h ago`;

		const diffInDays = Math.floor(diffInHours / 24);
		if (diffInDays < 7) return `${diffInDays}d ago`;

		// For older dates, show the actual date
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {})
		});
	};

	// Utility function to format datetime for tooltip
	const formatStatusUpdatedAtTooltip = (updatedAt: string | null): string => {
		if (!updatedAt) return '';

		const date = new Date(updatedAt);
		return date.toLocaleString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			second: '2-digit',
			timeZoneName: 'short'
		});
	};

	let { data } = $props();
	let { supabase, user } = $derived(data);

	// Client-side loaded data
	let dashboardData = $state<DashboardData | null>(null);
	let isLoadingData = $state(true);
	let isInitialLoad = $state(true);

	// Derived values from dashboard data
	let currentStatus = $derived(dashboardData?.currentStatus || '');
	let friendRequests = $derived(dashboardData?.friendRequests || []);
	let sentFriendRequests = $derived(dashboardData?.sentFriendRequests || []);
	let friends = $derived(dashboardData?.friends || []);

	// Reactive state
	let statusInputText = $state('');

	// Load dashboard data on client side
	$effect(() => {
		if (user && supabase) {
			loadDashboardData();
		}
	});

	const loadDashboardData = async (showSkeletons = true) => {
		if (!user || !supabase) return;

		// Only show skeletons if this is the initial load or explicitly requested
		if (showSkeletons) {
			isLoadingData = true;
		}

		try {
			const dataLoader = new DashboardDataLoader(supabase, user.id);
			dashboardData = await dataLoader.loadAllData();
		} catch (error) {
			handleDatabaseError(error, 'load dashboard data');
		} finally {
			if (showSkeletons) {
				isLoadingData = false;
			}
			// Mark that initial load is complete
			isInitialLoad = false;
		}
	};

	const refreshData = async () => {
		await loadDashboardData(false); // Don't show skeletons on refresh
	};

	let statusCharacterCount = $derived(statusInputText.length);

	// Loading states
	let isUpdatingStatus = $state(false);
	let isSendingFriendRequest = $state(false);
	let processingRequests = $state(new Set<string>());
	let deletingFriends = $state(new Set<string>());
	let cancellingRequests = $state(new Set<string>());

	// Modal state for friend deletion confirmation
	let showDeleteModal = $state(false);
	let friendToDelete = $state<{ id: string; name: string } | null>(null);

	const handleStatusUpdate: EventHandler<SubmitEvent, HTMLFormElement> = async (evt) => {
		evt.preventDefault();
		if (!requireAuth(user, supabase) || !user || !supabase) return;

		const validationError = validateStatus(statusInputText);
		if (validationError) {
			NotificationManager.showError(validationError);
			return;
		}

		isUpdatingStatus = true;
		try {
			const { error } = await supabase.from('profiles').upsert(
				{
					id: user.id,
					status: statusInputText
				},
				{ onConflict: 'id' }
			);

			if (error) {
				handleDatabaseError(error, 'update status');
				return;
			}

			await refreshData();
			statusInputText = '';
			NotificationManager.showSuccess('Status updated successfully');
		} catch (error) {
			handleDatabaseError(error, 'update status');
		} finally {
			isUpdatingStatus = false;
		}
	};

	const handleFriendRequest: EventHandler<SubmitEvent, HTMLFormElement> = async (evt) => {
		evt.preventDefault();
		if (!evt.target || !requireAuth(user, supabase) || !user || !supabase) return;

		const form = evt.target as HTMLFormElement;
		const username = (new FormData(form).get('username') ?? '') as string;
		const targetUsername = sanitizeUsername(username);

		if (!targetUsername) {
			NotificationManager.showError('Please enter a valid username');
			return;
		}

		isSendingFriendRequest = true;
		try {
			// Find target user
			const targetUser = await findUserByUsername(supabase, targetUsername);
			if (!targetUser) {
				NotificationManager.showError(ERROR_MESSAGES.USER_NOT_FOUND);
				return;
			}

			// Check if trying to friend themselves
			if (targetUser.id === user.id) {
				NotificationManager.showError(ERROR_MESSAGES.CANNOT_FRIEND_SELF);
				return;
			}

			// Check if already friends
			const areFriends = await verifyFriendshipExists(supabase, user.id, targetUser.id);
			if (areFriends) {
				NotificationManager.showError(ERROR_MESSAGES.ALREADY_FRIENDS);
				return;
			}

			// Check existing outgoing request
			const { exists: hasOutgoingRequest, request: existingRequest } =
				await checkExistingFriendRequest(supabase, user.id, targetUser.id);

			if (hasOutgoingRequest && existingRequest) {
				if (existingRequest.status === 'pending') {
					NotificationManager.showError(ERROR_MESSAGES.REQUEST_ALREADY_SENT);
					return;
				} else if (existingRequest.status === 'rejected') {
					// Reactivate rejected request
					const { error } = await supabase
						.from('friend_requests')
						.update({ status: 'pending' })
						.eq('id', existingRequest.id);

					if (error) {
						handleDatabaseError(error, 'send friend request');
						return;
					}

					await refreshData();
					form.reset();
					NotificationManager.showSuccess('Friend request sent!');
					return;
				} else if (existingRequest.status === 'accepted') {
					// Clean up orphaned accepted request
					await supabase.from('friend_requests').delete().eq('id', existingRequest.id);
				}
			}

			// Check incoming request
			const { isPending: hasIncomingRequest } = await checkIncomingFriendRequest(
				supabase,
				user.id,
				targetUser.id
			);

			if (hasIncomingRequest) {
				NotificationManager.showError(ERROR_MESSAGES.INCOMING_REQUEST_EXISTS);
				return;
			}

			// Send new friend request
			const { error } = await supabase.from('friend_requests').insert({
				requester_id: user.id,
				target_id: targetUser.id,
				status: 'pending'
			});

			if (error) {
				handleDatabaseError(error, 'send friend request');
				return;
			}

			await refreshData();
			form.reset();
			NotificationManager.showSuccess('Friend request sent!');
		} catch (error) {
			handleDatabaseError(error, 'send friend request');
		} finally {
			isSendingFriendRequest = false;
		}
	};

	const handleFriendRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
		if (!requireAuth(user, supabase) || !user || !supabase) return;

		// Add to processing set to show loading state
		processingRequests.add(requestId);
		processingRequests = processingRequests;

		try {
			if (action === 'accept') {
				// Get the request details first
				const { data: request, error: requestError } = await supabase
					.from('friend_requests')
					.select('requester_id, target_id')
					.eq('id', requestId)
					.single();

				if (requestError) {
					if (requestError.code === 'PGRST116') {
						NotificationManager.showError(
							'This friend request no longer exists. It may have been cancelled.'
						);
					} else {
						handleDatabaseError(requestError, 'process friend request');
					}
					return;
				}

				if (!request) {
					NotificationManager.showError('Friend request data not found.');
					return;
				}

				// Create friendship connections (bidirectional)
				const { error: friendError } = await supabase.from('friends').insert([
					{ user_id: request.requester_id, friend_id: request.target_id },
					{ user_id: request.target_id, friend_id: request.requester_id }
				]);

				if (friendError) {
					handleDatabaseError(friendError, 'create friendship');
					return;
				}

				// Delete the accepted friend request
				const { error: deleteError, count: deleteCount } = await supabase
					.from('friend_requests')
					.delete()
					.eq('id', requestId);

				if (deleteError) {
					console.error('Failed to delete accepted friend request:', deleteError);
					// Don't return here - the friendship was created successfully
				} else {
					console.log(`Successfully deleted friend request ${requestId}, count: ${deleteCount}`);
				}

				NotificationManager.showSuccess('Friend request accepted!');
			} else {
				// Reject the request - delete it instead of just updating status
				const { error, count: deleteCount } = await supabase
					.from('friend_requests')
					.delete()
					.eq('id', requestId);

				if (error) {
					handleDatabaseError(error, 'reject friend request');
					return;
				} else {
					console.log(
						`Successfully deleted rejected friend request ${requestId}, count: ${deleteCount}`
					);
				}

				NotificationManager.showSuccess('Friend request rejected');
			}

			// Immediately update the UI by removing the processed request
			if (action === 'accept') {
				// Remove from incoming friend requests
				if (dashboardData) {
					dashboardData.friendRequests = dashboardData.friendRequests.filter(
						(req) => req.id !== requestId
					);
				}
			} else {
				// Remove from incoming friend requests
				if (dashboardData) {
					dashboardData.friendRequests = dashboardData.friendRequests.filter(
						(req) => req.id !== requestId
					);
				}
			}

			// Also refresh data to ensure consistency
			await refreshData();
		} catch (error) {
			handleDatabaseError(error, `${action} friend request`);
		} finally {
			processingRequests.delete(requestId);
			processingRequests = processingRequests;
		}
	};

	const handleDeleteFriend = (friendId: string) => {
		// Find the friend to get their display name
		const friend = friends.find((f) => f.id === friendId);
		if (!friend) return;

		// Set the friend to delete and show modal
		friendToDelete = {
			id: friendId,
			name: getDisplayName(friend.display_name, friend.username)
		};
		showDeleteModal = true;
	};

	const confirmDeleteFriend = async () => {
		if (!friendToDelete || !requireAuth(user, supabase) || !user || !supabase) return;

		const friendId = friendToDelete.id;

		// Add to deleting set to show loading state
		deletingFriends.add(friendId);
		deletingFriends = deletingFriends;

		try {
			// First, verify the friendship exists before attempting deletion
			const friendshipExists = await verifyFriendshipExists(supabase, user.id, friendId);
			if (!friendshipExists) {
				NotificationManager.showError(
					'No friendship found to remove. The friendship may have already been removed.'
				);
				return;
			}

			// Delete both directions of the friendship in parallel
			const [result1, result2] = await Promise.all([
				supabase.from('friends').delete().eq('user_id', user.id).eq('friend_id', friendId),
				supabase.from('friends').delete().eq('user_id', friendId).eq('friend_id', user.id)
			]);

			// Check if either deletion had an error
			if (result1.error || result2.error) {
				const error = result1.error || result2.error;
				handleDatabaseError(error, 'remove friend');
				return;
			}

			// If no errors occurred, consider the deletion successful
			// (Supabase may return count as null/0 even on successful deletion with 204 status)

			await refreshData();
			NotificationManager.showSuccess('Friend removed successfully');
		} catch (error) {
			handleDatabaseError(error, 'remove friend');
		} finally {
			deletingFriends.delete(friendId);
			deletingFriends = deletingFriends;
			// Close modal
			showDeleteModal = false;
			friendToDelete = null;
		}
	};

	const cancelDeleteFriend = () => {
		showDeleteModal = false;
		friendToDelete = null;
	};

	const handleCancelFriendRequest = async (requestId: string) => {
		if (!requireAuth(user, supabase) || !user || !supabase) return;

		// Confirm cancellation
		if (!confirm('Are you sure you want to cancel this friend request?')) {
			return;
		}

		// Add to cancelling set to show loading state
		cancellingRequests.add(requestId);
		cancellingRequests = cancellingRequests;

		try {
			const { error } = await supabase
				.from('friend_requests')
				.delete()
				.eq('id', requestId)
				.eq('requester_id', user.id); // Ensure user can only cancel their own requests

			if (error) {
				handleDatabaseError(error, 'cancel friend request');
				return;
			}

			// Immediately update the UI by removing the cancelled request
			if (dashboardData) {
				dashboardData.sentFriendRequests = dashboardData.sentFriendRequests.filter(
					(req) => req.id !== requestId
				);
			}

			// Also refresh data to ensure consistency
			await refreshData();
			NotificationManager.showSuccess('Friend request cancelled successfully');
		} catch (error) {
			handleDatabaseError(error, 'cancel friend request');
		} finally {
			cancellingRequests.delete(requestId);
			cancellingRequests = cancellingRequests;
		}
	};
</script>

<div class="p-4">
	<h1 class="text-2xl font-bold">
		Welcome, {getDisplayName(
			dashboardData?.currentDisplayName || null,
			dashboardData?.currentUsername || ''
		)}!
	</h1>

	<div class="divider"></div>

	<!-- Friends List - Full Width -->
	{#if isInitialLoad && isLoadingData}
		<div class="mb-4">
			<div class="card bg-base-200">
				<div class="card-body">
					<h2 class="card-title">My Friends</h2>
					<div class="space-y-3">
						{#each Array.from({ length: 3 }, (_, i) => i) as i (i)}
							<div class="bg-base-300 rounded-box p-4">
								<div class="flex w-full items-start gap-3">
									<!-- Avatar skeleton -->
									<div class="skeleton h-12 w-12 flex-shrink-0 rounded-full"></div>

									<!-- Content skeleton -->
									<div class="min-w-0 flex-1">
										<div
											class="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
										>
											<div class="min-w-0">
												<div class="skeleton mb-1 h-4 w-32"></div>
												<div class="skeleton h-3 w-24"></div>
											</div>
											<div class="skeleton h-8 w-8 flex-shrink-0"></div>
										</div>
										<div class="skeleton h-3 w-full max-w-xs"></div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="mb-4">
			<div class="card bg-base-200">
				<div class="card-body">
					<h2 class="card-title">My Friends</h2>
					<ul class="list">
						{#if friends && friends.length > 0}
							{#each friends as friend (friend.id)}
								<li class="bg-base-300 rounded-box group mb-3 p-4">
									<div class="flex w-full items-start gap-3">
										<!-- Avatar and Delete Button Container -->
										<div class="flex flex-shrink-0 flex-col items-center gap-2">
											<!-- Avatar -->
											<div class="avatar avatar-placeholder">
												<div class="bg-neutral text-neutral-content w-12 rounded-full">
													<span>
														{getDisplayName(friend.display_name, friend.username)
															.charAt(0)
															.toUpperCase()}
													</span>
												</div>
											</div>

											<!-- Delete Button - Mobile only -->
											<button
												class="btn btn-sm btn-error btn-outline opacity-100 transition-opacity duration-200 sm:hidden"
												onclick={() => handleDeleteFriend(friend.id)}
												disabled={deletingFriends.has(friend.id)}
												title="Remove friend"
											>
												{#if deletingFriends.has(friend.id)}
													<span class="loading loading-spinner loading-xs"></span>
												{:else}
													<svg
														xmlns="http://www.w3.org/2000/svg"
														class="h-4 w-4 stroke-current"
														fill="none"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
														/>
													</svg>
												{/if}
											</button>
										</div>

										<!-- Friend Info -->
										<div class="min-w-0 flex-1">
											<!-- Name and Username -->
											<div
												class="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
											>
												<div class="min-w-0">
													<h3 class="truncate text-base font-semibold">
														{getDisplayName(friend.display_name, friend.username)}
													</h3>
													{#if friend.display_name}
														<p class="text-base-content/60 truncate text-sm">@{friend.username}</p>
													{/if}
												</div>

												<!-- Delete Button - Desktop only -->
												<button
													class="btn btn-sm btn-error btn-outline hidden flex-shrink-0 opacity-0 transition-opacity duration-200 sm:flex sm:opacity-100 sm:group-hover:opacity-100"
													onclick={() => handleDeleteFriend(friend.id)}
													disabled={deletingFriends.has(friend.id)}
													title="Remove friend"
												>
													{#if deletingFriends.has(friend.id)}
														<span class="loading loading-spinner loading-xs"></span>
													{:else}
														<svg
															xmlns="http://www.w3.org/2000/svg"
															class="h-4 w-4 stroke-current"
															fill="none"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
															/>
														</svg>
													{/if}
												</button>
											</div>

											<!-- Status -->
											<div class="mb-2">
												{#if friend.status}
													<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
														<p class="text-base-content/80 text-sm break-words">
															{friend.status}
														</p>
														{#if friend.status_updated_at}
															<div
																class="tooltip tooltip-top sm:tooltip-left"
																data-tip={formatStatusUpdatedAtTooltip(friend.status_updated_at)}
															>
																<span
																	class="text-base-content/50 cursor-help text-xs whitespace-nowrap"
																>
																	{formatStatusUpdatedAt(friend.status_updated_at)}
																</span>
															</div>
														{/if}
													</div>
												{:else}
													<p class="text-base-content/50 text-sm italic">No status</p>
												{/if}
											</div>
										</div>
									</div>
								</li>
							{/each}
						{:else}
							<li class="list-row">No friends yet. Send some requests!</li>
						{/if}
					</ul>
				</div>
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- Status Section -->
		{#if isInitialLoad && isLoadingData}
			<div class="card bg-base-200">
				<div class="card-body">
					<h2 class="card-title">Status</h2>

					<!-- Current status display skeleton -->
					<div class="bg-base-300 mb-4 rounded-lg p-3">
						<div class="skeleton h-6 w-48"></div>
					</div>

					<!-- Status input form skeleton -->
					<div class="join w-full">
						<div class="w-full">
							<div class="skeleton h-12 w-full"></div>
						</div>
						<div class="skeleton h-12 w-32"></div>
					</div>
				</div>
			</div>
		{:else}
			<div class="card bg-base-200">
				<div class="card-body">
					<h2 class="card-title">Status</h2>

					<form onsubmit={handleStatusUpdate} class="mb-4">
						<div class="join w-full">
							<div class="w-full">
								<input
									type="text"
									class="input join-item w-full {statusCharacterCount > MAX_STATUS_LENGTH
										? 'input-error'
										: ''}"
									placeholder="What's on your mind?"
									bind:value={statusInputText}
									maxlength={MAX_STATUS_LENGTH}
									required
									title="Status message"
								/>
								<div
									class="validator-hint {statusCharacterCount > MAX_STATUS_LENGTH ? '' : 'hidden'}"
								>
									{statusCharacterCount}/{MAX_STATUS_LENGTH} characters
									{statusCharacterCount > MAX_STATUS_LENGTH ? ' - Status too long!' : ''}
								</div>
							</div>
							<button class="btn btn-neutral join-item" disabled={isUpdatingStatus}>
								{#if isUpdatingStatus}
									<span class="loading loading-spinner loading-sm"></span>
									Updating...
								{:else}
									Update
								{/if}
							</button>
						</div>
					</form>

					{#if currentStatus}
						<div class="bg-base-300 mt-4 rounded-lg p-3">
							<p class="text-lg">{currentStatus}</p>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Friend Request Section -->
		{#if isInitialLoad && isLoadingData}
			<div class="card bg-base-200">
				<div class="card-body">
					<h2 class="card-title">Friend Requests</h2>

					<!-- Friend request form skeleton -->
					<div class="join mb-4 w-full">
						<div class="w-full">
							<div class="skeleton h-12 w-full"></div>
						</div>
						<div class="skeleton h-12 w-40"></div>
					</div>

					<!-- Friend requests list skeleton -->
					<div class="space-y-2">
						{#each Array.from({ length: 2 }, (_, i) => i) as i (i)}
							<div class="bg-base-300 rounded-box p-2">
								<div class="flex items-center justify-between">
									<div class="skeleton h-4 w-48"></div>
									<div class="join">
										<div class="skeleton h-8 w-8"></div>
										<div class="skeleton h-8 w-8"></div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{:else}
			<div class="card bg-base-200">
				<div class="card-body">
					<h2 class="card-title">Friend Requests</h2>

					<form onsubmit={handleFriendRequest} class="mb-4">
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
										id="friend-username"
										name="username"
										type="text"
										required
										placeholder="Username"
										pattern="[A-Za-z][A-Za-z0-9._\-]*"
										minlength="3"
										maxlength="20"
										title="Must start with a letter, then letters, numbers, dots, dashes, or underscores"
									/>
								</label>
							</div>
							<button class="btn btn-neutral join-item" disabled={isSendingFriendRequest}>
								{#if isSendingFriendRequest}
									<span class="loading loading-spinner loading-sm"></span>
									Sending...
								{:else}
									Send
								{/if}
							</button>
						</div>
					</form>

					<!-- Pending Friend Requests -->
					{#if friendRequests && friendRequests.length > 0}
						<h3 class="mt-4 font-bold">Friend Requests</h3>
						<ul class="list">
							{#each friendRequests as request (request.id)}
								<li class="bg-base-300 rounded-box mb-2 p-2">
									<div class="flex w-full items-center justify-between">
										<div class="flex flex-col">
											<span
												>{getDisplayName(
													request.requester_display_name,
													request.requester_username
												)} wants to be your friend</span
											>
											{#if request.requester_display_name}
												<span class="text-base-content/60 text-xs"
													>@{request.requester_username}</span
												>
											{/if}
										</div>
										<div class="join">
											<button
												class="btn btn-sm btn-success join-item"
												onclick={() => handleFriendRequestAction(request.id, 'accept')}
												disabled={processingRequests.has(request.id)}
											>
												{#if processingRequests.has(request.id)}
													<span class="loading loading-spinner loading-xs"></span>
												{:else}
													<svg
														xmlns="http://www.w3.org/2000/svg"
														class="h-6 w-6 shrink-0 stroke-current"
														fill="none"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
														/>
													</svg>
												{/if}
											</button>
											<button
												class="btn btn-sm btn-error join-item"
												onclick={() => handleFriendRequestAction(request.id, 'reject')}
												disabled={processingRequests.has(request.id)}
											>
												{#if processingRequests.has(request.id)}
													<span class="loading loading-spinner loading-xs"></span>
												{:else}
													<svg
														xmlns="http://www.w3.org/2000/svg"
														class="h-6 w-6 shrink-0 stroke-current"
														fill="none"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
														/>
													</svg>
												{/if}
											</button>
										</div>
									</div>
								</li>
							{/each}
						</ul>
					{/if}

					<!-- Sent Friend Requests -->
					{#if sentFriendRequests && sentFriendRequests.length > 0}
						<h3 class="mt-4 font-bold">Sent Friend Requests</h3>
						<ul class="list">
							{#each sentFriendRequests as request (request.id)}
								<li class="bg-base-300 rounded-box group mb-2 p-2">
									<div class="flex w-full items-center justify-between">
										<div class="flex flex-col">
											<span
												>{getDisplayName(
													request.target_display_name,
													request.target_username
												)}</span
											>
											{#if request.target_display_name}
												<span class="text-base-content/60 text-xs">@{request.target_username}</span>
											{/if}
										</div>
										<button
											class="btn btn-sm btn-error"
											onclick={() => handleCancelFriendRequest(request.id)}
											disabled={cancellingRequests.has(request.id)}
										>
											{#if cancellingRequests.has(request.id)}
												<span class="loading loading-spinner loading-xs"></span>
											{:else}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													class="h-6 w-6 shrink-0 stroke-current"
													fill="none"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
													/>
												</svg>
											{/if}
										</button>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Friend Deletion Confirmation Modal -->
<dialog open={showDeleteModal} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Remove Friend</h3>
		<p class="py-4">
			Are you sure you want to remove <strong>{friendToDelete?.name}</strong> from your friends list?
			This action cannot be undone.
		</p>
		<div class="modal-action">
			<button
				class="btn btn-error"
				onclick={confirmDeleteFriend}
				disabled={friendToDelete ? deletingFriends.has(friendToDelete.id) : false}
			>
				{#if friendToDelete && deletingFriends.has(friendToDelete.id)}
					<span class="loading loading-spinner loading-sm"></span>
					Removing...
				{:else}
					Remove Friend
				{/if}
			</button>
			<button class="btn" onclick={cancelDeleteFriend}> Cancel </button>
		</div>
	</div>
</dialog>
