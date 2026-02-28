<script lang="ts">
	import DeleteFriendModal from '$lib/friends/components/DeleteModal.svelte';
	import FriendRequestsSection from '$lib/friends/components/Requests.svelte';
	import FriendRequestsSectionSkeleton from '$lib/friends/components/RequestsSkeleton.svelte';
	import FriendsList from '$lib/friends/components/List.svelte';
	import LoadingSkeletons from '$lib/friends/components/ListSkeleton.svelte';
	import StatusSection from '$lib/status/components/Section.svelte';
	import StatusSectionSkeleton from '$lib/status/components/Skeleton.svelte';
	import { DashboardDataLoader, type DashboardData } from '$lib/dashboard/loader';
	import { getDisplayName, handleDatabaseError, NotificationManager } from '$lib/ui/notifications';
	import { validateStatus } from '$lib/status/validation';
	import { verifyFriendshipExists } from '$lib/friends/api';
	import { friendOrderStore } from '$lib/friends/order';
	import { RealtimeSubscriptionManager } from '$lib/realtime/subscriptions';

	let { data } = $props();
	let { supabase, user } = $derived(data);

	// Client-side loaded data
	let dashboardData = $state<DashboardData | null>(null);
	let isLoadingData = $state(true);
	let isInitialLoad = $state(true);
	let isReady = $derived(!(isInitialLoad && isLoadingData));
	let hasLoadedData = false;

	// Derived values from dashboard data
	let currentStatus = $derived(dashboardData?.currentStatus || '');
	let friendRequests = $derived(dashboardData?.friendRequests || []);
	let sentFriendRequests = $derived(dashboardData?.sentFriendRequests || []);
	let rawFriends = $derived(dashboardData?.friends || []);
	let friends = $derived(friendOrderStore.getOrderedFriends(rawFriends));
	let quickStatuses = $derived(dashboardData?.quickStatuses || []);

	// Reactive state
	let statusInputText = $state('');

	// Loading states
	let isUpdatingStatus = $state(false);
	let deletingFriends = $state(new Set<string>());

	// Modal state for friend deletion confirmation
	let showDeleteModal = $state(false);
	let friendToDelete = $state<{ id: string; name: string } | null>(null);

	// Real-time subscription manager (non-reactive to avoid effect loops)
	let subscriptionManager: RealtimeSubscriptionManager | null = null;
	let refreshTimer: ReturnType<typeof setTimeout> | null = null;
	// Track the user ID we've subscribed for (non-reactive to avoid effect loops)
	let subscribedUserId: string | null = null;

	// Load dashboard data on client side - only run once when user/supabase become available
	$effect(() => {
		if (user && supabase && !hasLoadedData) {
			loadDashboardData();
			hasLoadedData = true;
		}
	});

	// Set up real-time subscriptions separately - only when user changes
	$effect(() => {
		const userId = user?.id;

		// If user/supabase unavailable, cleanup and exit
		if (!userId || !supabase) {
			if (subscribedUserId) {
				cleanupRealtimeSubscriptions();
				subscribedUserId = null;
			}
			return;
		}

		// If already subscribed for this user, just ensure cleanup on unmount
		if (subscribedUserId === userId) {
			return () => {
				// Cleanup on unmount
				if (subscribedUserId === userId) {
					cleanupRealtimeSubscriptions();
					subscribedUserId = null;
				}
			};
		}

		// Clean up old subscriptions if user changed
		if (subscribedUserId && subscribedUserId !== userId) {
			cleanupRealtimeSubscriptions();
		}

		// Set up new subscriptions
		setupRealtimeSubscriptions();
		subscribedUserId = userId;

		// Cleanup on unmount
		return () => {
			cleanupRealtimeSubscriptions();
			subscribedUserId = null;
		};
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
			// Keep the profiles subscription scoped to the current friend list.
			// Safe to call on every refresh — no-op when the list hasn't changed.
			subscriptionManager?.updateFriendIds(dashboardData.friends.map((f) => f.id));
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

	// Debounced refresh to avoid too many rapid refreshes from multiple events
	const debouncedRefresh = () => {
		if (refreshTimer) {
			clearTimeout(refreshTimer);
		}
		refreshTimer = setTimeout(() => {
			refreshData();
		}, 300); // Wait 300ms for additional events to batch
	};

	// Set up real-time subscriptions
	const setupRealtimeSubscriptions = () => {
		if (!user || !supabase || subscriptionManager) return;

		try {
			const manager = new RealtimeSubscriptionManager(supabase, user.id);
			manager.subscribe({
				onFriendRequestChange: debouncedRefresh,
				onFriendshipChange: debouncedRefresh,
				onStatusChange: debouncedRefresh
			});
			subscriptionManager = manager;
		} catch (error) {
			console.error('Failed to set up real-time subscriptions:', error);
			// Real-time subscriptions are optional - the app will still work without them
		}
	};

	// Clean up real-time subscriptions
	const cleanupRealtimeSubscriptions = () => {
		if (refreshTimer) {
			clearTimeout(refreshTimer);
			refreshTimer = null;
		}
		if (subscriptionManager) {
			subscriptionManager.unsubscribe();
			subscriptionManager = null;
		}
	};

	// Event handlers - defined as functions that can access current state
	const handleStatusUpdate = async (evt: SubmitEvent) => {
		evt.preventDefault();
		if (!user || !supabase) return;

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

	const handleReorderFriends = (reorderedFriends: typeof friends) => {
		// Update the friend order in the store
		friendOrderStore.updateOrder(reorderedFriends);
	};

	const confirmDeleteFriend = async () => {
		if (!friendToDelete || !user || !supabase) return;

		const friendId = friendToDelete.id;

		// Add to deleting set to show loading state
		deletingFriends = new Set([...deletingFriends, friendId]);

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

			// Remove friend from order store
			friendOrderStore.removeFriend(friendId);

			await refreshData();
			NotificationManager.showSuccess('Friend removed successfully');
		} catch (error) {
			handleDatabaseError(error, 'remove friend');
		} finally {
			deletingFriends = new Set([...deletingFriends].filter((id) => id !== friendId));
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
	{#if !isReady}
		<LoadingSkeletons />
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<StatusSectionSkeleton />
			<FriendRequestsSectionSkeleton />
		</div>
	{:else}
		<div class="mb-4">
			<FriendsList
				{friends}
				{deletingFriends}
				onDeleteFriend={handleDeleteFriend}
				onReorderFriends={handleReorderFriends}
			/>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<StatusSection
				{currentStatus}
				{isUpdatingStatus}
				{quickStatuses}
				onStatusUpdate={handleStatusUpdate}
				bind:statusInputText
			/>
			<FriendRequestsSection
				{friendRequests}
				{sentFriendRequests}
				{supabase}
				{user}
				onDataRefresh={refreshData}
			/>
		</div>
	{/if}
</div>

<!-- Friend Deletion Confirmation Modal -->
<DeleteFriendModal
	{showDeleteModal}
	{friendToDelete}
	{deletingFriends}
	onConfirmDelete={confirmDeleteFriend}
	onCancelDelete={cancelDeleteFriend}
/>
