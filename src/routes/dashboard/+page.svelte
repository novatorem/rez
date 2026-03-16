<script lang="ts">
  import GettingStarted from '$lib/dashboard/GettingStarted.svelte';
  import { DashboardDataLoader, type DashboardData } from '$lib/dashboard/loader';
  import { verifyFriendshipExists } from '$lib/friends/api';
  import DeleteFriendModal from '$lib/friends/components/DeleteModal.svelte';
  import FriendsList from '$lib/friends/components/List.svelte';
  import LoadingSkeletons from '$lib/friends/components/ListSkeleton.svelte';
  import { friendOrderStore } from '$lib/friends/order';
  import {
    RealtimeSubscriptionManager,
    type StatusChangePayload
  } from '$lib/realtime/subscriptions';
  import StatusSection from '$lib/status/components/Section.svelte';
  import StatusSectionSkeleton from '$lib/status/components/Skeleton.svelte';
  import { validateStatus } from '$lib/status/validation';
  import { getDisplayName, handleDatabaseError, NotificationManager } from '$lib/ui/notifications';

  let { data } = $props();
  let { supabase, user } = $derived(data);

  let dashboardData = $state<DashboardData | null>(null);
  let isLoadingData = $state(true);
  let isInitialLoad = $state(true);
  let isReady = $derived(!(isInitialLoad && isLoadingData));
  let hasLoadedData = false;

  let currentStatus = $derived(dashboardData?.currentStatus || '');
  let rawFriends = $derived(dashboardData?.friends || []);
  let friends = $derived(friendOrderStore.getOrderedFriends(rawFriends));
  let quickStatuses = $derived(dashboardData?.quickStatuses || []);

  let statusInputText = $state('');
  let isUpdatingStatus = $state(false);
  let deletingFriends = $state(new Set<string>());

  let showDeleteModal = $state(false);
  let friendToDelete = $state<{ id: string; name: string } | null>(null);

  let subscriptionManager: RealtimeSubscriptionManager | null = null;
  let fullRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  let subscribedUserId: string | null = null;

  $effect(() => {
    if (user && supabase && !hasLoadedData) {
      loadDashboardData();
      hasLoadedData = true;
    }
  });

  $effect(() => {
    const userId = user?.id;

    if (!userId || !supabase) {
      if (subscribedUserId) {
        cleanupRealtimeSubscriptions();
        subscribedUserId = null;
      }
      return;
    }

    if (subscribedUserId === userId) {
      return () => {
        if (subscribedUserId === userId) {
          cleanupRealtimeSubscriptions();
          subscribedUserId = null;
        }
      };
    }

    if (subscribedUserId && subscribedUserId !== userId) {
      cleanupRealtimeSubscriptions();
    }

    setupRealtimeSubscriptions();
    subscribedUserId = userId;

    return () => {
      cleanupRealtimeSubscriptions();
      subscribedUserId = null;
    };
  });

  const loadDashboardData = async (showSkeletons = true) => {
    if (!user || !supabase) return;

    if (showSkeletons) {
      isLoadingData = true;
    }

    try {
      const dataLoader = new DashboardDataLoader(supabase, user.id);
      dashboardData = await dataLoader.loadAllData();
      subscriptionManager?.updateFriendIds(dashboardData.friends.map((f) => f.id));
    } catch (error) {
      handleDatabaseError(error, 'load dashboard data');
    } finally {
      if (showSkeletons) {
        isLoadingData = false;
      }
      isInitialLoad = false;
    }
  };

  const refreshData = async () => {
    await loadDashboardData(false);
  };

  const handleRealtimeStatusChange = (payload: StatusChangePayload) => {
    if (!dashboardData) return;

    const idx = dashboardData.friends.findIndex((f) => f.id === payload.id);
    if (idx === -1) return;

    dashboardData.friends[idx] = {
      ...dashboardData.friends[idx],
      status: payload.status,
      status_updated_at: payload.updated_at
    };
    dashboardData = { ...dashboardData };
  };

  const debouncedFullRefresh = () => {
    if (fullRefreshTimer) clearTimeout(fullRefreshTimer);
    fullRefreshTimer = setTimeout(() => refreshData(), 300);
  };

  const setupRealtimeSubscriptions = () => {
    if (!user || !supabase || subscriptionManager) return;

    try {
      const manager = new RealtimeSubscriptionManager(supabase, user.id);
      manager.subscribe({
        onFriendshipChange: debouncedFullRefresh,
        onStatusChange: handleRealtimeStatusChange
      });
      subscriptionManager = manager;
    } catch (error) {
      console.error('Failed to set up real-time subscriptions:', error);
    }
  };

  const cleanupRealtimeSubscriptions = () => {
    if (fullRefreshTimer) {
      clearTimeout(fullRefreshTimer);
      fullRefreshTimer = null;
    }
    if (subscriptionManager) {
      subscriptionManager.unsubscribe();
      subscriptionManager = null;
    }
  };

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
      NotificationManager.showSuccess('Status updated.');
    } catch (error) {
      handleDatabaseError(error, 'update status');
    } finally {
      isUpdatingStatus = false;
    }
  };

  const handleDeleteFriend = (friendId: string) => {
    const friend = friends.find((f) => f.id === friendId);
    if (!friend) return;

    friendToDelete = {
      id: friendId,
      name: getDisplayName(friend.display_name, friend.username)
    };
    showDeleteModal = true;
  };

  const handleReorderFriends = (reorderedFriends: typeof friends) => {
    friendOrderStore.updateOrder(reorderedFriends);
  };

  const confirmDeleteFriend = async () => {
    if (!friendToDelete || !user || !supabase) return;

    const friendId = friendToDelete.id;

    deletingFriends = new Set([...deletingFriends, friendId]);

    try {
      const friendshipExists = await verifyFriendshipExists(supabase, user.id, friendId);
      if (!friendshipExists) {
        NotificationManager.showError(
          "Couldn't remove - they may have already left your friends list."
        );
        return;
      }

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

      friendOrderStore.removeFriend(friendId);

      await refreshData();
      NotificationManager.showSuccess('Friend removed.');
    } catch (error) {
      handleDatabaseError(error, 'remove friend');
    } finally {
      deletingFriends = new Set([...deletingFriends].filter((id) => id !== friendId));
      showDeleteModal = false;
      friendToDelete = null;
    }
  };

  const cancelDeleteFriend = () => {
    showDeleteModal = false;
    friendToDelete = null;
  };
</script>

<div class="container mx-auto flex max-w-2xl flex-col gap-4 p-4">
  {#if !isReady}
    <StatusSectionSkeleton />
    <LoadingSkeletons />
  {:else}
    <GettingStarted hasStatus={!!currentStatus} hasFriends={friends.length > 0} />

    <div class="animate-fade-in-up" style="animation-delay: 0ms">
      <StatusSection
        {currentStatus}
        {isUpdatingStatus}
        {quickStatuses}
        onStatusUpdate={handleStatusUpdate}
        bind:statusInputText
      />
    </div>

    <div class="animate-fade-in-up" style="animation-delay: 80ms">
      <FriendsList
        {friends}
        {deletingFriends}
        onDeleteFriend={handleDeleteFriend}
        onReorderFriends={handleReorderFriends}
      />
    </div>
  {/if}
</div>

<DeleteFriendModal
  {showDeleteModal}
  {friendToDelete}
  {deletingFriends}
  onConfirmDelete={confirmDeleteFriend}
  onCancelDelete={cancelDeleteFriend}
/>
