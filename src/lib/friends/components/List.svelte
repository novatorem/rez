<script lang="ts">
  import { browser } from '$app/environment';
  import { resolve } from '$app/paths';
  import { formatStatusUpdatedAtTooltip } from '$lib/status/formatting';
  import { getDisplayName } from '$lib/ui/notifications';
  import RelativeTime from '$lib/ui/RelativeTime.svelte';
  import Avatar from 'svelte-boring-avatars';
  import { avatarSettings } from '$lib/stores/avatar.svelte';
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';
  import { fly, scale } from 'svelte/transition';

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

  type SortKey = 'time' | 'username' | 'display_name';
  type SortDir = 'asc' | 'desc';

  const SORT_LABELS: Record<SortKey, string> = {
    time: 'Time',
    username: 'Username',
    display_name: 'Display name'
  };

  let sortKey: SortKey | null = $state(null);
  let sortDir: SortDir = $state('desc');
  let showSortMenu = $state(false);
  let expandedFriendId: string | null = $state(null);

  function toggleExpand(friendId: string) {
    expandedFriendId = expandedFriendId === friendId ? null : friendId;
  }

  function applySort(key: SortKey, dir: SortDir) {
    const sorted = [...friends].sort((a, b) => {
      if (key === 'time') {
        const tA = a.status_updated_at ? new Date(a.status_updated_at).getTime() : 0;
        const tB = b.status_updated_at ? new Date(b.status_updated_at).getTime() : 0;
        return dir === 'asc' ? tA - tB : tB - tA;
      }
      const valA = (
        key === 'username' ? a.username : getDisplayName(a.display_name, a.username)
      ).toLowerCase();
      const valB = (
        key === 'username' ? b.username : getDisplayName(b.display_name, b.username)
      ).toLowerCase();
      const cmp = valA.localeCompare(valB);
      return dir === 'asc' ? cmp : -cmp;
    });
    friends = sorted;
    onReorderFriends?.(sorted);
  }

  function handleSortOption(key: SortKey) {
    if (sortKey === key) {
      const newDir: SortDir = sortDir === 'asc' ? 'desc' : 'asc';
      sortDir = newDir;
      applySort(key, newDir);
    } else {
      sortKey = key;
      sortDir = key === 'time' ? 'desc' : 'asc';
      applySort(key, sortDir);
    }
  }

  let lastDroppedId: string | null = $state(null);
  let lastDroppedTimer: ReturnType<typeof setTimeout> | null = null;

  let draggedFriend: Friend | null = $state(null);
  let draggedIndex = $state(-1);
  let dropGapIndex = $state(-1);

  let containerRef: HTMLDivElement | null = $state(null);

  let touchStartY = 0;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;

  let cachedItemRects: { top: number; bottom: number; height: number }[] = [];
  let touchMoveRafId: number | null = null;
  let pendingTouchY: number | null = null;

  const isTouch = browser && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  function cacheTouchRects() {
    if (!containerRef) return;
    const els = containerRef.querySelectorAll<HTMLElement>('.draggable-item');
    cachedItemRects = Array.from(els).map((el) => {
      const { top, bottom, height } = el.getBoundingClientRect();
      return { top, bottom, height };
    });
  }

  function updateDropGapFromY(currentY: number) {
    let gap = cachedItemRects.length;
    for (let i = 0; i < cachedItemRects.length; i++) {
      const { top, bottom, height } = cachedItemRects[i];
      if (currentY <= top) {
        gap = i;
        break;
      }
      if (currentY <= bottom) {
        gap = currentY < top + height / 2 ? i : i + 1;
        break;
      }
    }
    dropGapIndex = Math.max(0, Math.min(gap, cachedItemRects.length));
  }

  function resetDragState() {
    if (touchMoveRafId !== null) {
      cancelAnimationFrame(touchMoveRafId);
      touchMoveRafId = null;
    }
    pendingTouchY = null;
    cachedItemRects = [];
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
      sortKey = null;
      if (lastDroppedTimer) clearTimeout(lastDroppedTimer);
      lastDroppedId = moved.id;
      lastDroppedTimer = setTimeout(() => {
        lastDroppedId = null;
      }, 900);
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
        cacheTouchRects();
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

      pendingTouchY = touch.clientY;
      if (touchMoveRafId === null) {
        touchMoveRafId = requestAnimationFrame(() => {
          touchMoveRafId = null;
          if (pendingTouchY !== null) {
            updateDropGapFromY(pendingTouchY);
            pendingTouchY = null;
          }
        });
      }
    }

    function onTouchEnd(event: TouchEvent) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      if (draggedIndex === -1) return;
      event.preventDefault();
      if (dropGapIndex === -1) {
        resetDragState();
        return;
      }
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
    <div class="mb-3 flex items-center justify-between">
      <h2 class="card-title">My Friends</h2>
      <button
        type="button"
        class="btn btn-ghost btn-xs gap-1 {sortKey
          ? 'text-base-content/70'
          : 'text-base-content/40 hover:text-base-content/60'}"
        onclick={() => {
          showSortMenu = !showSortMenu;
        }}
        aria-expanded={showSortMenu}
        aria-label={showSortMenu ? 'Hide sort options' : 'Sort friends'}
      >
        {#if sortKey}
          <span>{SORT_LABELS[sortKey]}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            {#if sortDir === 'asc'}
              <path d="M12 19V5M5 12l7-7 7 7" />
            {:else}
              <path d="M12 5v14M5 12l7 7 7-7" />
            {/if}
          </svg>
        {:else}
          <span>Order</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3 w-3 transition-transform duration-200 {showSortMenu ? 'rotate-180' : ''}"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        {/if}
      </button>
    </div>

    {#if showSortMenu}
      <div
        transition:fly={{ y: -6, duration: 160, easing: cubicOut }}
        class="mb-3 flex flex-wrap gap-1.5"
      >
        {#each Object.entries(SORT_LABELS) as [key, label] (key)}
          {@const k = key as SortKey}
          {@const active = sortKey === k}
          <button
            type="button"
            class="btn btn-xs gap-1 {active
              ? 'btn-neutral'
              : 'btn-ghost text-base-content/50 hover:text-base-content/70'}"
            onclick={() => handleSortOption(k)}
            aria-pressed={active}
          >
            {label}
            {#if active}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-2.5 w-2.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                {#if sortDir === 'asc'}
                  <path d="M12 19V5M5 12l7-7 7 7" />
                {:else}
                  <path d="M12 5v14M5 12l7 7 7-7" />
                {/if}
              </svg>
            {/if}
          </button>
        {/each}
      </div>
    {/if}

    <div class="space-y-3" role="list" bind:this={containerRef} ondragleave={handleDragLeave}>
      {#if friends && friends.length > 0}
        {#each friends as friend, index (friend.id)}
          <div animate:flip={{ duration: 240, easing: cubicOut }}>
            {#if draggedIndex !== -1 && dropGapIndex === index && !isNeutralGap(dropGapIndex, draggedIndex)}
              <div
                in:scale={{ duration: 160, start: 0.4, easing: cubicOut }}
                class="bg-primary mx-2 mb-3 h-0.5 rounded-full"
              ></div>
            {/if}
            <div
              in:fly={{ y: 10, duration: 260, delay: Math.min(index * 45, 220), easing: cubicOut }}
              class="draggable-item bg-base-300 rounded-box group cursor-move px-3 py-3 {draggedIndex ===
              index
                ? 'dragging opacity-50'
                : ''} {lastDroppedId === friend.id ? 'just-placed' : ''}"
              use:touchDragAction={isTouch ? [friend, index] : undefined}
              draggable={!isTouch}
              role="button"
              tabindex="0"
              aria-expanded={expandedFriendId === friend.id}
              onclick={() => toggleExpand(friend.id)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleExpand(friend.id);
                }
              }}
              ondragstart={(e) => handleDragStart(e, friend, index)}
              ondragover={(e) => handleDragOver(e, index)}
              ondrop={handleDrop}
              ondragend={handleDragEnd}
            >
              <div class="flex w-full items-center gap-3">
                <div class="flex w-28 flex-shrink-0 items-center gap-2.5 sm:w-36">
                  <div class="avatar flex-shrink-0">
                    <Avatar
                      name={friend.id}
                      size={40}
                      variant={avatarSettings.variant}
                      colors={avatarSettings.colors}
                    />
                  </div>
                  <div class="min-w-0">
                    <h3 class="truncate text-sm leading-tight font-semibold">
                      {getDisplayName(friend.display_name, friend.username)}
                    </h3>
                    {#if friend.display_name}
                      <p class="text-base-content/50 truncate text-xs">@{friend.username}</p>
                    {/if}
                  </div>
                </div>

                <div class="bg-base-content/10 h-8 w-px flex-shrink-0" aria-hidden="true"></div>

                <div class="min-w-0 flex-1">
                  {#key friend.status}
                    {#if friend.status}
                      <div class="animate-status-reveal flex min-w-0 items-baseline gap-x-2">
                        <p class="text-base-content/85 min-w-0 truncate text-sm font-medium">
                          {friend.status}
                        </p>
                        {#if friend.status_updated_at}
                          <div
                            class="tooltip tooltip-top flex-shrink-0"
                            data-tip={formatStatusUpdatedAtTooltip(friend.status_updated_at)}
                          >
                            <span
                              class="text-base-content/40 flex-shrink-0 cursor-help text-xs whitespace-nowrap"
                            >
                              <RelativeTime timestamp={friend.status_updated_at} />
                            </span>
                          </div>
                        {/if}
                      </div>
                    {:else}
                      <p class="text-base-content/35 text-sm italic">No status</p>
                    {/if}
                  {/key}
                </div>

                {#if deletingFriends.has(friend.id)}
                  <span
                    class="loading loading-spinner loading-xs text-base-content/40 flex-shrink-0"
                  ></span>
                {/if}
              </div>

              <div
                class="grid transition-[grid-template-rows] duration-200 ease-out"
                style="grid-template-rows: {expandedFriendId === friend.id ? '1fr' : '0fr'}"
                aria-hidden={expandedFriendId !== friend.id}
              >
                <div class="overflow-hidden">
                  <div class="border-base-content/10 mt-2.5 border-t pt-2.5">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        {#if friend.status}
                          <p class="text-base-content/80 mb-1 text-sm font-medium break-words">
                            {friend.status}
                          </p>
                        {:else}
                          <p class="text-base-content/35 mb-1 text-sm italic">No status set</p>
                        {/if}
                        {#if friend.status_updated_at}
                          <p class="text-base-content/40 text-xs">
                            {formatStatusUpdatedAtTooltip(friend.status_updated_at)}
                          </p>
                        {/if}
                      </div>
                      <button
                        type="button"
                        class="btn btn-ghost btn-xs btn-circle text-base-content/30 hover:text-error flex-shrink-0 hover:bg-transparent"
                        aria-label="Remove {getDisplayName(friend.display_name, friend.username)}"
                        onclick={(e) => {
                          e.stopPropagation();
                          onDeleteFriend(friend.id);
                          expandedFriendId = null;
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          stroke-width="1.5"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M15 9l-6 6M9 9l6 6"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/each}

        {#if draggedIndex !== -1 && dropGapIndex === friends.length && !isNeutralGap(dropGapIndex, draggedIndex)}
          <div
            in:scale={{ duration: 160, start: 0.4, easing: cubicOut }}
            class="bg-primary mx-2 h-0.5 rounded-full"
          ></div>
        {/if}
      {:else}
        <div class="bg-base-300 rounded-box p-6 text-center">
          <p class="text-base-content/70 mb-1 font-medium">No friends yet</p>
          <p class="text-base-content/50 text-sm">
            <a href={resolve('/dashboard/friends')} class="link link-primary">Add friends</a> by searching
            for their username.
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

  :global(.draggable-item.just-placed) {
    animation: justPlaced 0.85s var(--ease-out-expo);
    outline-offset: 2px;
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
