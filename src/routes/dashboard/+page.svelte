<script lang="ts">
	import { DashboardDataLoader, type DashboardData } from '$lib/dashboard-data-loader';
	import {
		checkExistingFriendRequest,
		checkIncomingFriendRequest,
		ERROR_MESSAGES,
		findUserByUsername,
		handleDatabaseError,
		MAX_STATUS_LENGTH,
		NotificationManager,
		requireAuth,
		sanitizeUsername,
		validateStatus,
		verifyFriendshipExists
	} from '$lib/dashboard-utils';
	import SkeletonCard from '$lib/SkeletonCard.svelte';
	import type { EventHandler } from 'svelte/elements';

	let { data } = $props();
	let { supabase, user } = $derived(data);

	// Client-side loaded data
	let dashboardData = $state<DashboardData | null>(null);
	let isLoadingData = $state(true);

	// Derived values from dashboard data
	let currentStatus = $derived(dashboardData?.currentStatus || '');
	let friendRequests = $derived(dashboardData?.friendRequests || []);
	let sentFriendRequests = $derived(dashboardData?.sentFriendRequests || []);
	let friends = $derived(dashboardData?.friends || []);

	// Reactive state
	let statusText = $derived(currentStatus || '');

	// Load dashboard data on client side
	$effect(() => {
		if (user && supabase) {
			loadDashboardData();
		}
	});

	const loadDashboardData = async () => {
		if (!user || !supabase) return;

		isLoadingData = true;
		try {
			const dataLoader = new DashboardDataLoader(supabase, user.id);
			dashboardData = await dataLoader.loadAllData();
		} catch (error) {
			handleDatabaseError(error, 'load dashboard data');
		} finally {
			isLoadingData = false;
		}
	};

	const refreshData = async () => {
		await loadDashboardData();
	};

	let statusCharacterCount = $derived(statusText.length);

	// Loading states
	let isUpdatingStatus = $state(false);
	let isSendingFriendRequest = $state(false);
	let processingRequests = $state(new Set<string>());
	let deletingFriends = $state(new Set<string>());
	let cancellingRequests = $state(new Set<string>());

	const handleStatusUpdate: EventHandler<SubmitEvent, HTMLFormElement> = async (evt) => {
		evt.preventDefault();
		if (!requireAuth(user, supabase) || !user || !supabase) return;

		const validationError = validateStatus(statusText);
		if (validationError) {
			NotificationManager.showError(validationError);
			return;
		}

		isUpdatingStatus = true;
		try {
			const { error } = await supabase.from('profiles').upsert(
				{
					id: user.id,
					status: statusText
				},
				{ onConflict: 'id' }
			);

			if (error) {
				handleDatabaseError(error, 'update status');
				return;
			}

			await refreshData();
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
				const { error: deleteError } = await supabase
					.from('friend_requests')
					.delete()
					.eq('id', requestId);

				if (deleteError) {
					console.warn('Failed to delete accepted friend request, but friendship was created');
				}

				NotificationManager.showSuccess('Friend request accepted!');
			} else {
				// Reject the request
				const { error } = await supabase
					.from('friend_requests')
					.update({ status: 'rejected' })
					.eq('id', requestId);

				if (error) {
					handleDatabaseError(error, 'reject friend request');
					return;
				}

				NotificationManager.showSuccess('Friend request rejected');
			}

			await refreshData();
		} catch (error) {
			handleDatabaseError(error, `${action} friend request`);
		} finally {
			processingRequests.delete(requestId);
			processingRequests = processingRequests;
		}
	};

	const handleDeleteFriend = async (friendId: string) => {
		if (!requireAuth(user, supabase) || !user || !supabase) return;

		// Confirm deletion
		if (!confirm('Are you sure you want to remove this friend?')) {
			return;
		}

		// Add to deleting set to show loading state
		deletingFriends.add(friendId);
		deletingFriends = deletingFriends;

		try {
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

			const totalDeleted = (result1.count || 0) + (result2.count || 0);

			if (totalDeleted === 0) {
				NotificationManager.showError(
					'No friendship found to remove. The friendship may have already been removed.'
				);
				return;
			}

			await refreshData();
			NotificationManager.showSuccess('Friend removed successfully');
		} catch (error) {
			handleDatabaseError(error, 'remove friend');
		} finally {
			deletingFriends.delete(friendId);
			deletingFriends = deletingFriends;
		}
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
	<h1 class="text-2xl font-bold">Welcome, {user?.email}</h1>

	<div class="divider"></div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- Status Section -->
		{#if isLoadingData}
			<SkeletonCard title="Status" />
		{:else}
			<div class="card bg-base-200">
				<div class="card-body">
					<h2 class="card-title">Status</h2>

					{#if currentStatus}
						<div class="bg-base-300 mb-4 rounded-lg p-3">
							<p class="text-lg">{currentStatus}</p>
						</div>
					{/if}

					<form onsubmit={handleStatusUpdate} class="mt-4">
						<div class="form-control">
							<label class="label" for="status-textarea">
								<span>Update your status</span>
								<span
									class="text-sm {statusCharacterCount > MAX_STATUS_LENGTH ? 'text-error' : ''}"
								>
									{statusCharacterCount}/{MAX_STATUS_LENGTH}
								</span>
							</label>
							<textarea
								id="status-textarea"
								bind:value={statusText}
								class="textarea textarea-bordered validator {statusCharacterCount >
								MAX_STATUS_LENGTH
									? 'textarea-error'
									: ''}"
								placeholder="What's on your mind?"
								rows="2"
								maxlength={MAX_STATUS_LENGTH}
								required
								title="Status message"
							></textarea>
							<p class="validator-hint">
								Limited to {MAX_STATUS_LENGTH} characters
							</p>
						</div>
						<button class="btn btn-primary mt-2" disabled={isUpdatingStatus}>
							{#if isUpdatingStatus}
								<span class="loading loading-spinner loading-sm"></span>
								Updating...
							{:else}
								Update Status
							{/if}
						</button>
					</form>
				</div>
			</div>
		{/if}

		<!-- Friend Request Section -->
		{#if isLoadingData}
			<SkeletonCard title="Friends" contentLines={4} />
		{:else}
			<div class="card bg-base-200">
				<div class="card-body">
					<h2 class="card-title">Friends</h2>

					<form onsubmit={handleFriendRequest} class="mb-4">
						<label class="input">
							<span>Friend's Username</span>
							<input id="friend-username" name="username" type="text" placeholder="@FriendName" />
						</label>
						<button class="btn btn-primary mt-2" disabled={isSendingFriendRequest}>
							{#if isSendingFriendRequest}
								<span class="loading loading-spinner loading-sm"></span>
								Sending...
							{:else}
								Send Friend Request
							{/if}
						</button>
					</form>

					<!-- Pending Friend Requests -->
					{#if friendRequests && friendRequests.length > 0}
						<h3 class="mt-4 font-bold">Friend Requests</h3>
						<ul class="list">
							{#each friendRequests as request (request.id)}
								<li class="list-row bg-base-300 rounded-box mb-2 p-2">
									<span>@{request.requester_username} wants to be your friend</span>
									<div class="join mt-2">
										<button
											class="btn btn-sm btn-success join-item"
											onclick={() => handleFriendRequestAction(request.id, 'accept')}
											disabled={processingRequests.has(request.id)}
										>
											{#if processingRequests.has(request.id)}
												<span class="loading loading-spinner loading-xs"></span>
											{:else}
												Accept
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
												Reject
											{/if}
										</button>
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
								<li class="list-row bg-base-300 rounded-box mb-2 p-2">
									<div class="flex items-center justify-between">
										<span>@{request.target_username}</span>
										<button
											class="btn btn-sm btn-error"
											onclick={() => handleCancelFriendRequest(request.id)}
											disabled={cancellingRequests.has(request.id)}
										>
											{#if cancellingRequests.has(request.id)}
												<span class="loading loading-spinner loading-xs"></span>
											{:else}
												Cancel
											{/if}
										</button>
									</div>
								</li>
							{/each}
						</ul>
					{/if}

					<!-- Friends List -->
					<h3 class="mt-4 font-bold">My Friends</h3>
					<ul class="list">
						{#if friends && friends.length > 0}
							{#each friends as friend (friend.id)}
								<li class="list-row bg-base-300 rounded-box mb-2 p-2">
									<div class="flex items-center justify-between">
										<div class="flex flex-col">
											<span class="font-medium">@{friend.username}</span>
											{#if friend.status}
												<span class="text-base-content/70 text-sm">{friend.status}</span>
											{:else}
												<span class="text-base-content/50 text-sm italic">No status</span>
											{/if}
										</div>
										<button
											class="btn btn-sm btn-error"
											onclick={() => handleDeleteFriend(friend.id)}
											disabled={deletingFriends.has(friend.id)}
										>
											{#if deletingFriends.has(friend.id)}
												<span class="loading loading-spinner loading-xs"></span>
											{:else}
												Remove
											{/if}
										</button>
									</div>
								</li>
							{/each}
						{:else}
							<li class="list-row">No friends yet. Send some requests!</li>
						{/if}
					</ul>
				</div>
			</div>
		{/if}
	</div>
</div>
