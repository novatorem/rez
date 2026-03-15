<script lang="ts">
  import FriendRequestsSection from '$lib/friends/components/Requests.svelte';
  import FriendRequestsSectionSkeleton from '$lib/friends/components/RequestsSkeleton.svelte';
  import { DashboardDataLoader, type FriendRequest, type SentFriendRequest } from '$lib/dashboard/loader';
  import { handleDatabaseError } from '$lib/ui/notifications';
  import { setPendingCount, markSeen, getPendingCount } from '$lib/friends/pendingCount.svelte.js';

  let { data } = $props();
  let { supabase, user } = $derived(data);

  let friendRequests = $state<FriendRequest[]>([]);
  let sentFriendRequests = $state<SentFriendRequest[]>([]);
  let isLoading = $state(true);
  let hasLoaded = false;

  $effect(() => {
    if (user && supabase && !hasLoaded) {
      loadData();
      hasLoaded = true;
    }
  });

  // Mark seen whenever this page is mounted or count changes while here
  $effect(() => {
    getPendingCount();
    markSeen();
  });

  const loadData = async () => {
    if (!user || !supabase) return;
    isLoading = true;
    try {
      const loader = new DashboardDataLoader(supabase, user.id);
      const [incoming, sent] = await Promise.all([
        loader.loadFriendRequests(),
        loader.loadSentFriendRequests()
      ]);
      friendRequests = incoming;
      sentFriendRequests = sent;
      setPendingCount(incoming.length);
    } catch (error) {
      handleDatabaseError(error, 'load friend requests');
    } finally {
      isLoading = false;
    }
  };
</script>

<div class="container mx-auto flex max-w-2xl flex-col gap-4 p-4">
  {#if isLoading}
    <FriendRequestsSectionSkeleton />
  {:else}
    <div class="animate-fade-in-up">
      <FriendRequestsSection
        {friendRequests}
        {sentFriendRequests}
        {supabase}
        {user}
        onDataRefresh={loadData}
      />
    </div>
  {/if}
</div>
