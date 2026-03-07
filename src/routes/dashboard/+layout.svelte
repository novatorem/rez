<script>
  import Navigation from '$lib/ui/Navigation.svelte';
  import { setPendingCount, markUnseen, initFromStorage } from '$lib/friends/pendingCount.svelte.js';

  let { data, children } = $props();
  let { supabase, user } = $derived(data);

  $effect(() => {
    if (!user || !supabase) return;

    const _user = user;
    const _supabase = supabase;

    const load = async () => {
      const { count } = await _supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('target_id', _user.id);
      setPendingCount(count ?? 0);
    };

    const init = async () => {
      await load();
      initFromStorage();
    };

    init();

    const channel = _supabase
      .channel(`layout-pending-${_user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friend_requests', filter: `target_id=eq.${_user.id}` },
        () => { load(); markUnseen(); }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'friend_requests', filter: `target_id=eq.${_user.id}` },
        load
      )
      .subscribe();

    return () => {
      _supabase.removeChannel(channel);
      setPendingCount(0);
    };
  });
</script>

<Navigation {supabase} />

<main>
  {@render children()}
</main>
