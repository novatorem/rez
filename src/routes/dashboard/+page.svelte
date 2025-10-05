<script lang="ts">
	import DeleteFriendModal from '$lib/components/DeleteFriendModal.svelte';
	import FriendRequestsSection from '$lib/components/FriendRequestsSection.svelte';
	import FriendRequestsSectionSkeleton from '$lib/components/FriendRequestsSectionSkeleton.svelte';
	import FriendsList from '$lib/components/FriendsList.svelte';
	import LoadingSkeletons from '$lib/components/LoadingSkeletons.svelte';
	import StatusSection from '$lib/components/StatusSection.svelte';
	import StatusSectionSkeleton from '$lib/components/StatusSectionSkeleton.svelte';
	import type { DashboardData } from '$lib/dashboard-data-loader';
	import { getDisplayName } from '$lib/dashboard-utils';

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
	let quickStatuses = $derived(dashboardData?.quickStatuses || []);

	// Reactive state
	let statusInputText = $state('');

	// Loading states
	let isUpdatingStatus = $state(false);
	let deletingFriends = $state(new Set<string>());

	// Modal state for friend deletion confirmation
	let showDeleteModal = $state(false);
	let friendToDelete = $state<{ id: string; name: string } | null>(null);

	// Load dashboard data on client side - only run once when user/supabase become available
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
			const { DashboardDataLoader } = await import('$lib/dashboard-data-loader');
			const dataLoader = new DashboardDataLoader(supabase, user.id);
			dashboardData = await dataLoader.loadAllData();
		} catch (error) {
			const { handleDatabaseError } = await import('$lib/dashboard-utils');
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

	// Event handlers - defined as functions that can access current state
	const handleStatusUpdate = async (evt: SubmitEvent) => {
		evt.preventDefault();
		if (!user || !supabase) return;

		const { validateStatus, handleDatabaseError, NotificationManager } = await import(
			'$lib/dashboard-utils'
		);

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
		if (!friendToDelete || !user || !supabase) return;

		const { verifyFriendshipExists, handleDatabaseError, NotificationManager } = await import(
			'$lib/dashboard-utils'
		);
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

			// Delete the single friendship record (works regardless of which direction it's stored)
			const { error } = await supabase
				.from('friends')
				.delete()
				.or(
					`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`
				);

			if (error) {
				handleDatabaseError(error, 'remove friend');
				return;
			}

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
</script>

<div class="p-4">
	{#if isInitialLoad && isLoadingData}
		<h1 class="text-2xl font-bold">
			Welcome, <span class="skeleton inline-block h-8 w-32"></span>!
		</h1>
	{:else}
		<h1 class="text-2xl font-bold">
			Welcome, {getDisplayName(
				dashboardData?.currentDisplayName || null,
				dashboardData?.currentUsername || ''
			)}!
		</h1>
	{/if}

	<div class="divider"></div>

	<!-- Friends List - Full Width -->
	{#if isInitialLoad && isLoadingData}
		<LoadingSkeletons />
	{:else}
		<div class="mb-4">
			<FriendsList {friends} {deletingFriends} onDeleteFriend={handleDeleteFriend} />
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- Status Section -->
		{#if isInitialLoad && isLoadingData}
			<StatusSectionSkeleton />
		{:else}
			<StatusSection
				{currentStatus}
				{isUpdatingStatus}
				{quickStatuses}
				onStatusUpdate={handleStatusUpdate}
				bind:statusInputText
			/>
		{/if}

		<!-- Friend Request Section -->
		{#if isInitialLoad && isLoadingData}
			<FriendRequestsSectionSkeleton />
		{:else}
			<FriendRequestsSection
				{friendRequests}
				{sentFriendRequests}
				{supabase}
				{user}
				onDataRefresh={refreshData}
			/>
		{/if}
	</div>
</div>

<!-- Friend Deletion Confirmation Modal -->
<DeleteFriendModal
	{showDeleteModal}
	{friendToDelete}
	{deletingFriends}
	onConfirmDelete={confirmDeleteFriend}
	onCancelDelete={cancelDeleteFriend}
/>
