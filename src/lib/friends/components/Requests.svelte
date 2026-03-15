<script lang="ts">
  import { checkExistingFriendRequest, checkIncomingFriendRequest } from '$lib/friends/api';
  import { getDisplayName, handleDatabaseError, NotificationManager } from '$lib/ui/notifications';
  import type { SupabaseClient, User } from '@supabase/supabase-js';
  import Avatar from 'svelte-boring-avatars';
  import { cubicOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';

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

  let isSendingFriendRequest = $state(false);
  let processingRequests = $state(new Set<string>());
  let cancellingRequests = $state(new Set<string>());
  let canSendRequest = $state(true);

  const RATE_LIMIT_PER_HOUR = 20;
  const POSTGRES_RLS_VIOLATION = '42501';

  async function hasExceededHourlyRequestLimit(): Promise<boolean> {
    if (!user || !supabase) return false;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('friend_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requester_id', user.id)
      .gte('created_at', oneHourAgo);

    return !error && count !== null && count >= RATE_LIMIT_PER_HOUR;
  }

  const handleFriendRequest = async (evt: SubmitEvent) => {
    evt.preventDefault();
    if (!user || !supabase || !canSendRequest) return;

    const formData = new FormData(evt.target as HTMLFormElement);
    const username = formData.get('username') as string;

    if (!username) {
      NotificationManager.showError('Enter a username to search.');
      return;
    }

    isSendingFriendRequest = true;
    try {
      if (await hasExceededHourlyRequestLimit()) {
        NotificationManager.showError(
          `You've hit the hourly limit for friend requests. Try again later.`
        );
        return;
      }

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
        NotificationManager.showError('No one found with that username.');
        return;
      }

      if (targetUser.id === user.id) {
        NotificationManager.showError("That's your own username!");
        return;
      }

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
        NotificationManager.showError("You're already friends with them.");
        return;
      }

      const existingOutgoing = await checkExistingFriendRequest(supabase, user.id, targetUser.id);
      if (existingOutgoing.exists) {
        NotificationManager.showError("You've already sent them a friend request.");
        return;
      }

      const existingIncoming = await checkIncomingFriendRequest(supabase, targetUser.id, user.id);
      if (existingIncoming.exists && existingIncoming.isPending) {
        NotificationManager.showError(
          "They've already sent you a request — check the list below."
        );
        return;
      }

      const { error: insertError } = await supabase.from('friend_requests').insert({
        requester_id: user.id,
        target_id: targetUser.id
      });

      if (insertError) {
        if (insertError.code === POSTGRES_RLS_VIOLATION) {
          NotificationManager.showError(
            `You've hit the hourly limit for friend requests. Try again later.`
          );
        } else {
          handleDatabaseError(insertError, 'send friend request');
        }
        return;
      }

      (evt.target as HTMLFormElement).reset();

      await onDataRefresh();
      NotificationManager.showSuccess(`Friend request sent to ${username}`);
    } catch (error) {
      handleDatabaseError(error, 'send friend request');
    } finally {
      isSendingFriendRequest = false;
      canSendRequest = false;
      setTimeout(() => {
        canSendRequest = true;
      }, 2000);
    }
  };

  const handleFriendRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
    if (!user || !supabase) return;

    processingRequests = new Set([...processingRequests, requestId]);

    try {
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
        NotificationManager.showError('This request is no longer available.');
        return;
      }

      if (action === 'accept') {
        const { data: existingFriendship } = await supabase
          .from('friends')
          .select('id')
          .or(
            `and(user_id.eq.${user.id},friend_id.eq.${friendRequest.requester_id}),and(user_id.eq.${friendRequest.requester_id},friend_id.eq.${user.id})`
          )
          .limit(1);

        if (existingFriendship && existingFriendship.length > 0) {
          NotificationManager.showError("You're already friends with them.");
          return;
        }

        const { error: insertError } = await supabase
          .from('friends')
          .insert({ user_id: user.id, friend_id: friendRequest.requester_id });

        if (insertError) {
          if (insertError.code === '23505') {
            NotificationManager.showError("You're already friends with them.");
          } else {
            handleDatabaseError(insertError, 'create friendship');
          }
          return;
        }

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
        const { error: deleteError } = await supabase
          .from('friend_requests')
          .delete()
          .eq('id', requestId);

        if (deleteError) {
          handleDatabaseError(deleteError, 'delete friend request');
          return;
        }

        NotificationManager.showSuccess('Friend request declined');
      }

      await onDataRefresh();
    } catch (error) {
      handleDatabaseError(error, `${action} friend request`);
    } finally {
      processingRequests = new Set([...processingRequests].filter((id) => id !== requestId));
    }
  };

  const handleCancelFriendRequest = async (requestId: string) => {
    if (!user || !supabase) return;

    cancellingRequests = new Set([...cancellingRequests, requestId]);

    try {
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
      cancellingRequests = new Set([...cancellingRequests].filter((id) => id !== requestId));
    }
  };
</script>

<div class="card bg-base-200">
  <div class="card-body">
    <h2 class="card-title">Add Friends</h2>

    <form onsubmit={handleFriendRequest} class="mb-2">
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
              aria-label="Friend's username"
              title="Must start with a letter, then letters, numbers, dots, dashes, or underscores"
              autocorrect="off"
              autocapitalize="none"
              spellcheck="false"
            />
          </label>
        </div>
        <button
          class="btn btn-neutral join-item"
          disabled={isSendingFriendRequest || !canSendRequest}
          aria-label="Send friend request"
        >
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
    <p class="text-base-content/50 mb-3 text-xs">
      Ask your friend for their username — they can find it in Settings.
    </p>

    {#if (!friendRequests || friendRequests.length === 0) && (!sentFriendRequests || sentFriendRequests.length === 0)}
      <p class="text-base-content/50 text-sm">
        No pending requests yet — search by username to add a friend.
      </p>
    {/if}

    {#if friendRequests && friendRequests.length > 0}
      <ul class="list mt-2">
        {#each friendRequests as request (request.id)}
          <li
            class="bg-base-300 rounded-box mb-2 p-2"
            in:fly={{ x: -16, duration: 260, easing: cubicOut }}
            out:fly={{ x: 24, duration: 200, easing: cubicOut }}
          >
            <div class="flex w-full items-center justify-between gap-3">
              <div class="flex flex-1 items-center gap-3">
                <div class="avatar">
                  <Avatar name={request.requester_id} size={40} variant="beam" />
                </div>
                <div class="flex min-w-0 flex-col">
                  <span class="truncate"
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
                  class="btn btn-success join-item sm:btn-sm"
                  onclick={() => handleFriendRequestAction(request.id, 'accept')}
                  disabled={processingRequests.has(request.id)}
                  aria-label="Accept friend request"
                >
                  {#if processingRequests.has(request.id)}
                    <span class="loading loading-spinner loading-xs"></span>
                  {:else}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5 shrink-0 stroke-current"
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
                  class="btn btn-error join-item sm:btn-sm"
                  onclick={() => handleFriendRequestAction(request.id, 'reject')}
                  disabled={processingRequests.has(request.id)}
                  aria-label="Decline friend request"
                >
                  {#if processingRequests.has(request.id)}
                    <span class="loading loading-spinner loading-xs"></span>
                  {:else}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5 shrink-0 stroke-current"
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

    {#if sentFriendRequests && sentFriendRequests.length > 0}
      <h3 class="mt-4 font-bold">Sent requests</h3>
      <ul class="list">
        {#each sentFriendRequests as request (request.id)}
          <li
            class="bg-base-300 rounded-box group mb-2 p-2"
            in:fly={{ x: -16, duration: 260, easing: cubicOut }}
            out:fly={{ x: 24, duration: 200, easing: cubicOut }}
          >
            <div class="flex w-full items-center justify-between gap-3">
              <div class="flex flex-1 items-center gap-3">
                <div class="avatar">
                  <Avatar name={request.target_id} size={40} variant="beam" />
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
                class="btn btn-ghost sm:btn-sm"
                onclick={() => handleCancelFriendRequest(request.id)}
                disabled={cancellingRequests.has(request.id)}
                aria-label="Cancel friend request"
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
