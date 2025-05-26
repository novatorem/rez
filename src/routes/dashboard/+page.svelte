<script lang="ts">
	import { invalidate } from '$app/navigation';
	import ThemeSelect from '$lib/theme-select.svelte';
	import type { EventHandler } from 'svelte/elements';

	let { data } = $props();
	let { currentStatus, supabase, user, friendRequests, friends, currentUsername } = $derived(data);

	let statusText = $state('');
	$effect(() => {
		statusText = currentStatus || '';
	});
	let statusCharacterCount = $derived(statusText.length);
	const MAX_STATUS_LENGTH = 64;

	let usernameText = $state('');
	$effect(() => {
		usernameText = currentUsername || '';
	});
	let usernameCharacterCount = $derived(usernameText.length);
	const MAX_USERNAME_LENGTH = 20;
	const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

	const handleStatusUpdate: EventHandler<SubmitEvent, HTMLFormElement> = async (evt) => {
		evt.preventDefault();
		if (!evt.target || !user || !supabase) return;

		if (statusText.length > MAX_STATUS_LENGTH) {
			alert(`Status must be ${MAX_STATUS_LENGTH} characters or less`);
			return;
		}

		// Upsert operation on profiles table - insert if not exists, update if exists
		const { error } = await supabase.from('profiles').upsert(
			{
				id: user.id,
				status: statusText
			},
			{ onConflict: 'id' }
		);

		if (error) {
			console.error(error);
			alert('Failed to update status');
			return;
		}

		invalidate('supabase:db:profiles');
	};

	const handleFriendRequest: EventHandler<SubmitEvent, HTMLFormElement> = async (evt) => {
		evt.preventDefault();
		if (!evt.target) return;

		if (!user) {
			alert('You must be logged in to send friend requests');
			return;
		}

		if (!supabase) {
			alert('Database connection not available');
			return;
		}

		const form = evt.target as HTMLFormElement;
		const username = (new FormData(form).get('username') ?? '') as string;

		// Remove @ prefix if present
		const targetUsername = username.startsWith('@') ? username.substring(1) : username;

		// Check if username is empty
		if (!targetUsername.trim()) {
			alert('Please enter a valid username');
			return;
		}

		// Check if user exists
		const { data: targetUser, error: userError } = await supabase
			.from('users')
			.select('id')
			.eq('username', targetUsername)
			.single();

		if (userError || !targetUser) {
			alert('User not found');
			return;
		}

		// Send friend request
		const { error } = await supabase.from('friend_requests').insert({
			requester_id: user.id,
			target_id: targetUser.id,
			status: 'pending'
		});

		if (error) {
			console.error(error);
			alert('Failed to send friend request');
			return;
		}

		invalidate('supabase:db:friend_requests');
		form.reset();
		alert('Friend request sent!');
	};

	const handleFriendRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
		if (!supabase) {
			alert('Database connection not available');
			return;
		}

		if (action === 'accept') {
			// First update the request status
			const { error: updateError } = await supabase
				.from('friend_requests')
				.update({ status: 'accepted' })
				.eq('id', requestId);

			if (updateError) {
				console.error(updateError);
				alert('Failed to accept friend request');
				return;
			}

			// Get the request details to create friend connection
			const { data: request, error: requestError } = await supabase
				.from('friend_requests')
				.select('requester_id, target_id')
				.eq('id', requestId)
				.single();

			if (requestError || !request) {
				console.error(requestError);
				return;
			}

			// Create friendship connections (bidirectional)
			const { error: friendError } = await supabase.from('friends').insert([
				{ user_id: request.requester_id, friend_id: request.target_id },
				{ user_id: request.target_id, friend_id: request.requester_id }
			]);

			if (friendError) {
				console.error(friendError);
				alert('Failed to create friendship');
				return;
			}
		} else {
			// Simply update the status to rejected
			const { error } = await supabase
				.from('friend_requests')
				.update({ status: 'rejected' })
				.eq('id', requestId);

			if (error) {
				console.error(error);
				alert('Failed to reject friend request');
				return;
			}
		}

		invalidate('supabase:db:friend_requests');
		invalidate('supabase:db:friends');
	};

	const handleUsernameUpdate: EventHandler<SubmitEvent, HTMLFormElement> = async (evt) => {
		evt.preventDefault();
		if (!evt.target || !user || !supabase) return;

		if (usernameText.length === 0) {
			alert('Username cannot be empty');
			return;
		}

		if (usernameText.length > MAX_USERNAME_LENGTH) {
			alert(`Username must be ${MAX_USERNAME_LENGTH} characters or less`);
			return;
		}

		if (!USERNAME_PATTERN.test(usernameText)) {
			alert('Username can only contain letters, numbers, and underscores');
			return;
		}

		// Check if username is already taken
		const { data: existingUser, error: checkError } = await supabase
			.from('users')
			.select('id')
			.eq('username', usernameText)
			.neq('id', user.id) // Exclude current user
			.single();

		if (checkError && checkError.code !== 'PGRST116') {
			// PGRST116 = 'No rows returned'
			console.error(checkError);
			alert('Error checking username availability');
			return;
		}

		if (existingUser) {
			alert('Username is already taken');
			return;
		}

		// Update username
		const { error: updateError } = await supabase
			.from('users')
			.update({
				username: usernameText
			})
			.eq('id', user.id);

		if (updateError) {
			console.error(updateError);
			alert('Failed to update username');
			return;
		}

		invalidate('supabase:db:users');
		alert('Username updated successfully');
	};
</script>

<div class="p-4">
	<h1 class="text-2xl font-bold">Welcome, {user?.email}</h1>

	<div class="divider"></div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- Username Section -->
		<div class="card bg-base-200">
			<div class="card-body">
				<h2 class="card-title">Username</h2>

				{#if currentUsername}
					<div class="bg-base-300 mb-4 rounded-lg p-3">
						<p class="text-lg">@{currentUsername}</p>
					</div>
				{/if}

				<form onsubmit={handleUsernameUpdate} class="mt-4">
					<div class="form-control">
						<label class="label" for="username-input">
							<span>{currentUsername ? 'Personalize' : 'Set'} your username</span>
							<span
								class="text-sm {usernameCharacterCount > MAX_USERNAME_LENGTH ? 'text-error' : ''}"
							>
								{usernameCharacterCount}/{MAX_USERNAME_LENGTH}
							</span>
						</label>
						<div class="input">
							<span>@</span>
							<input
								id="username-input"
								bind:value={usernameText}
								class={usernameText && !USERNAME_PATTERN.test(usernameText) ? 'input-error' : ''}
								placeholder="username"
								maxlength={MAX_USERNAME_LENGTH}
							/>
						</div>
						<div class="text-base-content mt-1 text-xs">
							Only letters, numbers, and underscores allowed
						</div>
					</div>
					<button class="btn btn-primary mt-2">
						{currentUsername ? 'Update Username' : 'Set Username'}
					</button>
				</form>
			</div>
		</div>

		<!-- Status Section -->
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
							<span class="text-sm {statusCharacterCount > MAX_STATUS_LENGTH ? 'text-error' : ''}">
								{statusCharacterCount}/{MAX_STATUS_LENGTH}
							</span>
						</label>
						<textarea
							id="status-textarea"
							bind:value={statusText}
							class="textarea textarea-bordered {statusCharacterCount > MAX_STATUS_LENGTH
								? 'textarea-error'
								: ''}"
							placeholder="What's on your mind?"
							rows="2"
							maxlength={MAX_STATUS_LENGTH}
						></textarea>
						<div class="text-base-content mt-1 text-xs">
							Limited to {MAX_STATUS_LENGTH} characters
						</div>
					</div>
					<button class="btn btn-primary mt-2">Update Status</button>
				</form>
			</div>
		</div>

		<!-- Friend Request Section -->
		<div class="card bg-base-200">
			<div class="card-body">
				<h2 class="card-title">Friends</h2>

				<form onsubmit={handleFriendRequest} class="mb-4">
					<label class="input">
						<span>Friend's Username</span>
						<input id="friend-username" name="username" type="text" placeholder="@FriendName" />
					</label>
					<button class="btn btn-primary mt-2">Send Friend Request</button>
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
									>
										Accept
									</button>
									<button
										class="btn btn-sm btn-error join-item"
										onclick={() => handleFriendRequestAction(request.id, 'reject')}
									>
										Reject
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
							<li class="list-row">@{friend.username}</li>
						{:else}
							<li class="list-row">No friends yet. Send some requests!</li>
						{/each}
					{:else}
						<li class="list-row">No friends yet. Send some requests!</li>
					{/if}
				</ul>
			</div>
		</div>
	</div>

	<div class="mt-8">
		<ThemeSelect />
	</div>
</div>
