<script lang="ts">
	import { getDisplayName } from '$lib/dashboard-utils';
	import type { SupabaseClient, User } from '@supabase/supabase-js';
	import Avatar from 'svelte-boring-avatars';

	interface FriendRequest {
		id: string;
		requester_id: string;
		requester_display_name: string | null;
		requester_username: string;
	}

	interface SentFriendRequest {
		id: string;
		target_id: string;
		target_display_name: string | null;
		target_username: string;
	}

	interface Props {
		friendRequests: FriendRequest[];
		sentFriendRequests: SentFriendRequest[];
		supabase: SupabaseClient | null;
		user: User | null;
		onDataRefresh: () => Promise<void>;
	}

	let { friendRequests, sentFriendRequests, supabase, user, onDataRefresh }: Props = $props();

	// Loading states
	let isSendingFriendRequest = $state(false);
	let processingRequests = $state(new Set<string>());
	let cancellingRequests = $state(new Set<string>());

	const handleFriendRequest = async (evt: SubmitEvent) => {
		evt.preventDefault();
		if (!user || !supabase) return;

		const {
			handleDatabaseError,
			NotificationManager,
			checkExistingFriendRequest,
			checkIncomingFriendRequest
		} = await import('$lib/dashboard-utils');

		const formData = new FormData(evt.target as HTMLFormElement);
		const username = formData.get('username') as string;

		if (!username) {
			NotificationManager.showError('Please enter a username');
			return;
		}

		isSendingFriendRequest = true;
		try {
			// First, find the target user by username
			const { data: targetUser, error: userError } = await supabase
				.from('users')
				.select('id, username')
				.eq('username', username)
				.maybeSingle();

			if (userError) {
				handleDatabaseError(userError, 'find user');
				return;
			}

			if (!targetUser) {
				NotificationManager.showError('User not found');
				return;
			}

			if (targetUser.id === user.id) {
				NotificationManager.showError('You cannot send a friend request to yourself');
				return;
			}

			// Check if they're already friends (single record check with OR)
			const { data: existingFriendship, error: friendshipError } = await supabase
				.from('friends')
				.select('id')
				.or(
					`and(user_id.eq.${user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user.id})`
				)
				.maybeSingle();

			if (friendshipError && friendshipError.code !== 'PGRST116') {
				handleDatabaseError(friendshipError, 'check friendship');
				return;
			}

			if (existingFriendship) {
				NotificationManager.showError('You are already friends with this user');
				return;
			}

			// Check for existing outgoing friend request
			const existingOutgoing = await checkExistingFriendRequest(supabase, user.id, targetUser.id);
			if (existingOutgoing.exists) {
				NotificationManager.showError('You have already sent a friend request to this user');
				return;
			}

			// Check for existing incoming friend request
			const existingIncoming = await checkIncomingFriendRequest(supabase, targetUser.id, user.id);
			if (existingIncoming.exists && existingIncoming.isPending) {
				NotificationManager.showError(
					'This user has already sent you a friend request. Check your pending requests.'
				);
				return;
			}

			// Create the friend request
			const { error: insertError } = await supabase.from('friend_requests').insert({
				requester_id: user.id,
				target_id: targetUser.id
			});

			if (insertError) {
				handleDatabaseError(insertError, 'send friend request');
				return;
			}

			// Clear the form
			(evt.target as HTMLFormElement).reset();

			await onDataRefresh();
			NotificationManager.showSuccess(`Friend request sent to ${username}`);
		} catch (error) {
			handleDatabaseError(error, 'send friend request');
		} finally {
			isSendingFriendRequest = false;
		}
	};

	const handleFriendRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
		if (!user || !supabase) return;

		const { handleDatabaseError, NotificationManager } = await import('$lib/dashboard-utils');

		// Add to processing set
		processingRequests.add(requestId);
		processingRequests = processingRequests;

		try {
			// Get the friend request details
			const { data: friendRequest, error: requestError } = await supabase
				.from('friend_requests')
				.select('requester_id, target_id')
				.eq('id', requestId)
				.eq('target_id', user.id)
				.maybeSingle();

			if (requestError) {
				handleDatabaseError(requestError, 'get friend request');
				return;
			}

			if (!friendRequest) {
				NotificationManager.showError('Friend request not found or already processed');
				return;
			}

			if (action === 'accept') {
				console.log('Accepting friend request:', { requestId, friendRequest });

				// First check if friendship already exists (prevent duplicates)
				const { data: existingFriendship } = await supabase
					.from('friends')
					.select('id')
					.or(
						`and(user_id.eq.${user.id},friend_id.eq.${friendRequest.requester_id}),and(user_id.eq.${friendRequest.requester_id},friend_id.eq.${user.id})`
					)
					.limit(1);

				if (existingFriendship && existingFriendship.length > 0) {
					console.log('Friendship already exists:', existingFriendship);
					NotificationManager.showError('You are already friends with this user');
					return;
				}

				// Create single friendship record - trigger will normalize the order
				console.log('Creating friendship record...');
				const { error: insertError } = await supabase
					.from('friends')
					.insert({ user_id: user.id, friend_id: friendRequest.requester_id });

				if (insertError) {
					console.error('Friendship creation error:', insertError);

					// If it's a duplicate key error, it means the friendship already exists
					if (insertError.code === '23505') {
						NotificationManager.showError('You are already friends with this user');
					} else {
						handleDatabaseError(insertError, 'create friendship');
					}
					return;
				}

				console.log('Friendship record created successfully');

				// Delete the friend request since it's been accepted
				const { error: deleteError } = await supabase
					.from('friend_requests')
					.delete()
					.eq('id', requestId);

				if (deleteError) {
					handleDatabaseError(deleteError, 'delete friend request');
					return;
				}

				NotificationManager.showSuccess('Friend request accepted');
			} else {
				// Delete the friend request since it's been rejected
				const { error: deleteError } = await supabase
					.from('friend_requests')
					.delete()
					.eq('id', requestId);

				if (deleteError) {
					handleDatabaseError(deleteError, 'delete friend request');
					return;
				}

				NotificationManager.showSuccess('Friend request rejected');
			}

			await onDataRefresh();
			console.log('Data refresh completed after friend request action');
		} catch (error) {
			handleDatabaseError(error, `${action} friend request`);
		} finally {
			processingRequests.delete(requestId);
			processingRequests = processingRequests;
		}
	};

	const handleCancelFriendRequest = async (requestId: string) => {
		if (!user || !supabase) return;

		const { handleDatabaseError, NotificationManager } = await import('$lib/dashboard-utils');

		// Add to cancelling set
		cancellingRequests.add(requestId);
		cancellingRequests = cancellingRequests;

		try {
			// Delete the friend request
			const { error } = await supabase
				.from('friend_requests')
				.delete()
				.eq('id', requestId)
				.eq('requester_id', user.id);

			if (error) {
				handleDatabaseError(error, 'cancel friend request');
				return;
			}

			await onDataRefresh();
			NotificationManager.showSuccess('Friend request cancelled');
		} catch (error) {
			handleDatabaseError(error, 'cancel friend request');
		} finally {
			cancellingRequests.delete(requestId);
			cancellingRequests = cancellingRequests;
		}
	};
</script>

<div class="card bg-base-200">
	<div class="card-body">
		<h2 class="card-title">Friend Requests</h2>

		<form onsubmit={handleFriendRequest} class="mb-4">
			<div class="join w-full">
				<div class="w-full">
					<label class="input validator join-item w-full">
						<svg class="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
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
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
							><path
								fill="currentColor"
								d="M4.4 19.425q-.5.2-.95-.088T3 18.5V14l8-2l-8-2V5.5q0-.55.45-.837t.95-.088l15.4 6.5q.625.275.625.925t-.625.925z"
							/></svg
						>
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
						<div class="flex w-full items-center justify-between gap-3">
							<div class="flex flex-1 items-center gap-3">
								<div class="avatar">
									<Avatar name={request.requester_id} size={40} variant="marble" />
								</div>
								<div class="flex flex-col">
									<span
										>{getDisplayName(request.requester_display_name, request.requester_username)} wants
										to be your friend</span
									>
									{#if request.requester_display_name}
										<span class="text-base-content/60 text-xs">@{request.requester_username}</span>
									{/if}
								</div>
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
						<div class="flex w-full items-center justify-between gap-3">
							<div class="flex flex-1 items-center gap-3">
								<div class="avatar">
									<Avatar name={request.target_id} size={40} variant="marble" />
								</div>
								<div class="flex flex-col">
									<span>{getDisplayName(request.target_display_name, request.target_username)}</span
									>
									{#if request.target_display_name}
										<span class="text-base-content/60 text-xs">@{request.target_username}</span>
									{/if}
								</div>
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
