<script lang="ts">
  import { browser } from '$app/environment';
  import { formatStatusUpdatedAtTooltip } from '$lib/status/formatting';
  import { getDisplayName } from '$lib/ui/notifications';
  import RelativeTime from '$lib/ui/RelativeTime.svelte';
  import Avatar from 'svelte-boring-avatars';

  interface Friend {
    id: string;
    display_name: string | null;
    username: string;
    status: string | null;
    status_updated_at: string | null;
  }

  interface Props {
    friends: Friend[];
    deletingFriends: Set<string>;
    onDeleteFriend: (friendId: string) => void;
    onReorderFriends?: (reorderedFriends: Friend[]) => void;
  }

  let { friends, deletingFriends, onDeleteFriend, onReorderFriends }: Props = $props();


  let draggedFriend: Friend | null = $state(null);
  let draggedIndex = $state(-1);
  let dropGapIndex = $state(-1);

  let containerRef: HTMLDivElement | null = $state(null);

  let touchStartY = 0;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;

  const isTouch = browser && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  function resetDragState() {
    draggedFriend = null;
    draggedIndex = -1;
    dropGapIndex = -1;
  }

  function commitReorder() {
    if (!draggedFriend || draggedIndex === -1 || dropGapIndex === -1) {
      resetDragState();
      return;
    }

    const adjustedInsertIndex = dropGapIndex > draggedIndex ? dropGapIndex - 1 : dropGapIndex;

    if (adjustedInsertIndex !== draggedIndex) {
      const next = [...friends];
      const [moved] = next.splice(draggedIndex, 1);
      next.splice(adjustedInsertIndex, 0, moved);
      friends = next;
      onReorderFriends?.(next);
    }

    resetDragState();
  }

  function handleDragStart(event: DragEvent, friend: Friend, index: number) {
    draggedFriend = friend;
    draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', friend.id);
    }
  }

  function handleDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    dropGapIndex = event.clientY < rect.top + rect.height / 2 ? index : index + 1;
  }

  function cursorLeftContainer(event: DragEvent): boolean {
    return !containerRef?.contains(event.relatedTarget as Node | null);
  }

  function handleDragLeave(event: DragEvent) {
    if (cursorLeftContainer(event)) {
      dropGapIndex = -1;
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    commitReorder();
  }

  function handleDragEnd() {
    resetDragState();
  }

  function touchDragAction(
    element: HTMLElement,
    params: [Friend, number] | undefined
  ): { update?: (params: [Friend, number] | undefined) => void; destroy?: () => void } {
    let currentFriend: Friend | null = null;
    let currentIndex = -1;
    let attached = false;

    function onTouchStart(event: TouchEvent) {
      if (!currentFriend || currentIndex === -1) return;
      touchStartY = event.touches[0].clientY;
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        draggedFriend = currentFriend;
        draggedIndex = currentIndex;
        navigator.vibrate?.(40);
      }, 400);
    }

    function onTouchMove(event: TouchEvent) {
      const touch = event.touches[0];
      if (longPressTimer && Math.abs(touch.clientY - touchStartY) > 8) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      if (draggedIndex === -1) return;
      event.preventDefault();

      if (!containerRef) return;

      const currentY = touch.clientY;
      const els = containerRef.querySelectorAll<HTMLElement>('.draggable-item');
      let gap = els.length;

      for (let i = 0; i < els.length; i++) {
        const rect = els[i].getBoundingClientRect();
        if (currentY <= rect.top) {
          gap = i;
          break;
        } else if (currentY <= rect.bottom) {
          gap = currentY < rect.top + rect.height / 2 ? i : i + 1;
          break;
        }
      }

      dropGapIndex = Math.max(0, Math.min(gap, els.length));
    }

    function onTouchEnd(event: TouchEvent) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      if (draggedIndex === -1) return;
      event.preventDefault();
      commitReorder();
    }

    function onTouchCancel() {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      resetDragState();
    }

    function attach() {
      if (!attached) {
        element.addEventListener('touchstart', onTouchStart, { passive: true });
        element.addEventListener('touchmove', onTouchMove, { passive: false });
        element.addEventListener('touchend', onTouchEnd, { passive: false });
        element.addEventListener('touchcancel', onTouchCancel, { passive: false });
        attached = true;
      }
    }

    function detach() {
      if (attached) {
        element.removeEventListener('touchstart', onTouchStart);
        element.removeEventListener('touchmove', onTouchMove);
        element.removeEventListener('touchend', onTouchEnd);
        element.removeEventListener('touchcancel', onTouchCancel);
        attached = false;
      }
    }

    if (params) {
      [currentFriend, currentIndex] = params;
      attach();
    }

    return {
      update(newParams) {
        if (!newParams) {
          detach();
          currentFriend = null;
          currentIndex = -1;
          return;
        }
        if (!attached) attach();
        [currentFriend, currentIndex] = newParams;
      },
      destroy: detach
    };
  }

  function isNeutralGap(gap: number, dragged: number) {
    return gap === dragged || gap === dragged + 1;
  }
</script>

<div class="card bg-base-200">
  <div class="card-body">
    <h2 class="card-title">My Friends</h2>
    <div class="space-y-3" role="list" bind:this={containerRef} ondragleave={handleDragLeave}>
      {#if friends && friends.length > 0}
        {#each friends as friend, index (friend.id)}
          {#if draggedIndex !== -1 && dropGapIndex === index && !isNeutralGap(dropGapIndex, draggedIndex)}
            <div class="mx-2 h-0.5 rounded-full bg-primary/70 transition-all duration-100"></div>
          {/if}
          <div
            class="draggable-item bg-base-300 rounded-box group cursor-move p-4 transition-all duration-200 hover:shadow-md {draggedIndex ===
            index
              ? 'dragging opacity-50'
              : ''}"
            use:touchDragAction={isTouch ? [friend, index] : undefined}
            draggable={!isTouch}
            role="button"
            tabindex="0"
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
            }}
            ondragstart={(e) => handleDragStart(e, friend, index)}
            ondragover={(e) => handleDragOver(e, index)}
            ondrop={handleDrop}
            ondragend={handleDragEnd}
          >
            <div class="flex w-full items-start gap-3">
              <div class="flex flex-shrink-0 cursor-grab items-center pt-2.5" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 text-base-content/25 transition-colors group-hover:text-base-content/50"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <circle cx="9" cy="6" r="1.5" />
                  <circle cx="15" cy="6" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" />
                  <circle cx="15" cy="12" r="1.5" />
                  <circle cx="9" cy="18" r="1.5" />
                  <circle cx="15" cy="18" r="1.5" />
                </svg>
              </div>
              <div class="flex-shrink-0">
                <div class="avatar">
                  <Avatar name={friend.id} size={48} variant="beam" />
                </div>
              </div>

              <div class="min-w-0 flex-1">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <div class="flex min-w-0 items-center gap-2">
                    <h3 class="truncate text-base font-semibold">
                      {getDisplayName(friend.display_name, friend.username)}
                    </h3>
                    {#if friend.display_name}
                      <p class="text-base-content/60 truncate text-sm">@{friend.username}</p>
                    {/if}
                  </div>

                  <button
                    class="btn btn-ghost btn-circle flex-shrink-0 text-base-content/30 hover:text-error sm:btn-sm"
                    onclick={() => onDeleteFriend(friend.id)}
                    disabled={deletingFriends.has(friend.id)}
                    aria-label="Remove {getDisplayName(friend.display_name, friend.username)}"
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

                <div class="mb-2">
                  {#key friend.status}
                  {#if friend.status}
                    <div class="animate-status-reveal flex flex-wrap items-baseline gap-x-2">
                      <p class="text-base-content/80 text-sm break-words">{friend.status}</p>
                      {#if friend.status_updated_at}
                        <div
                          class="tooltip tooltip-top"
                          data-tip={formatStatusUpdatedAtTooltip(friend.status_updated_at)}
                        >
                          <span class="text-base-content/40 cursor-help text-xs whitespace-nowrap">
                            <RelativeTime timestamp={friend.status_updated_at} />
                          </span>
                        </div>
                      {/if}
                    </div>
                  {:else}
                    <p class="text-base-content/50 text-sm italic">No status</p>
                  {/if}
                  {/key}
                </div>
              </div>
            </div>
          </div>
        {/each}

        {#if draggedIndex !== -1 && dropGapIndex === friends.length && !isNeutralGap(dropGapIndex, draggedIndex)}
          <div class="mx-2 h-0.5 rounded-full bg-primary/70 transition-all duration-100"></div>
        {/if}
      {:else}
        <div class="bg-base-300 rounded-box p-6 text-center">
          <p class="text-base-content/70 mb-1 font-medium">No friends yet</p>
          <p class="text-base-content/50 text-sm">
            Search for friends by username in the panel below.
          </p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  :global(.draggable-item) {
    transition:
      opacity 0.15s ease,
      transform 0.15s ease,
      box-shadow 0.15s ease;
  }

  :global(.draggable-item:hover:not(.dragging)) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px color-mix(in oklch, var(--color-base-content) 12%, transparent);
  }

  :global(.draggable-item:active) {
    cursor: grabbing;
  }

  :global(.draggable-item.dragging) {
    will-change: transform, opacity;
    transform: scale(1.03);
    transform-origin: center;
    box-shadow: 0 12px 32px color-mix(in oklch, var(--color-base-content) 20%, transparent);
    z-index: 10;
  }

  :global(.dragging) {
    user-select: none;
    -webkit-user-select: none;
  }

  @media (hover: none) and (pointer: coarse) {
    :global(.draggable-item) {
      touch-action: pan-y;
    }

    :global(.draggable-item.dragging) {
      touch-action: none;
    }
  }
</style>
