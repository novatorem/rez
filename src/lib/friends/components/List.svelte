<script lang="ts">
	import { browser } from '$app/environment';
	import {
		formatStatusUpdatedAt,
		formatStatusUpdatedAtTooltip
	} from '$lib/status/formatting';
	import { getDisplayName } from '$lib/ui/notifications';
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

	// Modal helpers
	function openStatusModal(friend: Friend) {
		const modal = document.getElementById(`status_modal_${friend.id}`) as HTMLDialogElement;
		modal?.showModal();
	}

	function closeModal(event: MouseEvent) {
		const target = event.target as HTMLDialogElement;
		if (target.tagName === 'DIALOG') target.close();
	}

	function stopPropagation(event: Event) {
		event.stopPropagation();
	}

	function handleModalKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
	}

	// --- Drag and drop state ---
	let draggedFriend: Friend | null = $state(null);
	let draggedIndex = $state(-1);
	// Insertion gap: 0 = before first item, friends.length = after last item
	let dropGapIndex = $state(-1);

	// Container ref for touch calculations and drag-leave detection
	let containerRef: HTMLDivElement | null = $state(null);

	// Touch state — plain vars, not reactive (not rendered)
	let touchStartY = 0;
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;

	// Cached once — touch support doesn't change mid-session
	const isTouch = browser && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

	function resetDragState() {
		draggedFriend = null;
		draggedIndex = -1;
		dropGapIndex = -1;
	}

	// Apply the pending reorder and notify the parent
	function commitReorder() {
		if (!draggedFriend || draggedIndex === -1 || dropGapIndex === -1) {
			resetDragState();
			return;
		}

		// Once the dragged item is removed from the array, indices above it shift down by one
		const insertAt = dropGapIndex > draggedIndex ? dropGapIndex - 1 : dropGapIndex;

		if (insertAt !== draggedIndex) {
			const next = [...friends];
			const [moved] = next.splice(draggedIndex, 1);
			next.splice(insertAt, 0, moved);
			friends = next;
			onReorderFriends?.(next);
		}

		resetDragState();
	}

	// --- Mouse drag handlers ---

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
		// Map cursor Y position within the element to an insertion gap
		const el = event.currentTarget as HTMLElement;
		const rect = el.getBoundingClientRect();
		dropGapIndex = event.clientY < rect.top + rect.height / 2 ? index : index + 1;
	}

	function handleDragLeave(event: DragEvent) {
		// Only clear the indicator when the cursor truly leaves the list container,
		// not when crossing between child elements
		if (!containerRef?.contains(event.relatedTarget as Node | null)) {
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

	// --- Touch drag action ---
	// Long-press (400 ms) initiates drag; moving the finger before 400 ms cancels
	// the timer so normal scrolling is unaffected.
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
				navigator.vibrate?.(40); // haptic feedback if supported
			}, 400);
		}

		function onTouchMove(event: TouchEvent) {
			const touch = event.touches[0];
			// Cancel long-press if finger moves significantly before it fires
			if (longPressTimer && Math.abs(touch.clientY - touchStartY) > 8) {
				clearTimeout(longPressTimer);
				longPressTimer = null;
			}

			if (draggedIndex === -1) return; // long-press hasn't fired yet — allow scroll
			event.preventDefault(); // block scroll while dragging

			if (!containerRef) return;

			const currentY = touch.clientY;
			const els = containerRef.querySelectorAll<HTMLElement>('.draggable-item');
			let gap = els.length; // default: append to end

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
			if (draggedIndex === -1) return; // was a tap, not a drag
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
				// touchstart can be passive — we only call preventDefault in touchmove/end
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

	// A gap is "neutral" (would not change order) if it sits directly before or
	// after the item currently being dragged.
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
							<!-- Avatar and Delete Button Container -->
							<div class="flex flex-shrink-0 flex-col items-center gap-2">
								<!-- Avatar -->
								<div class="avatar">
									<Avatar name={friend.id} size={48} variant="beam" />
								</div>

								<!-- Delete Button - Mobile only -->
								<button
									class="btn btn-sm btn-error btn-outline opacity-100 transition-opacity duration-200 sm:hidden"
									onclick={() => onDeleteFriend(friend.id)}
									disabled={deletingFriends.has(friend.id)}
									title="Remove friend"
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

							<!-- Friend Info -->
							<div class="min-w-0 flex-1">
								<!-- Name and Username -->
								<div
									class="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
								>
									<div class="flex min-w-0 items-center gap-2">
										<h3 class="truncate text-base font-semibold">
											{getDisplayName(friend.display_name, friend.username)}
										</h3>
										{#if friend.display_name}
											<p class="text-base-content/60 truncate text-sm">@{friend.username}</p>
										{/if}
									</div>

									<!-- Delete Button - Desktop only -->
									<button
										class="btn btn-sm btn-error btn-outline hidden flex-shrink-0 opacity-0 transition-opacity duration-200 sm:flex sm:opacity-100 sm:group-hover:opacity-100"
										onclick={() => onDeleteFriend(friend.id)}
										disabled={deletingFriends.has(friend.id)}
										title="Remove friend"
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

								<!-- Status -->
								<div class="mb-2">
									{#if friend.status}
										<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
											<p class="text-base-content/80 text-sm break-words">
												{friend.status}
											</p>
											{#if friend.status_updated_at}
												<!-- Tooltip for larger screens -->
												<div
													class="tooltip tooltip-right md:tooltip-left hidden sm:block"
													data-tip={formatStatusUpdatedAtTooltip(friend.status_updated_at)}
												>
													<span class="text-base-content/50 cursor-help text-xs whitespace-nowrap">
														{formatStatusUpdatedAt(friend.status_updated_at)}
													</span>
												</div>

												<!-- Clickable element for smaller screens -->
												<button
													class="text-base-content/50 hover:text-base-content/70 cursor-pointer text-left text-xs whitespace-nowrap transition-colors sm:hidden"
													onclick={() => openStatusModal(friend)}
												>
													{formatStatusUpdatedAt(friend.status_updated_at)}
												</button>
											{/if}
										</div>
									{:else}
										<p class="text-base-content/50 text-sm italic">No status</p>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/each}

				<!-- Gap indicator after the last item -->
				{#if draggedIndex !== -1 && dropGapIndex === friends.length && !isNeutralGap(dropGapIndex, draggedIndex)}
					<div class="mx-2 h-0.5 rounded-full bg-primary/70 transition-all duration-100"></div>
				{/if}
			{:else}
				<div class="bg-base-300 rounded-box p-4 text-center">
					<p class="text-base-content/60">No friends yet. Send some requests!</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Status Date Modals for Mobile -->
{#each friends as friend (friend.id)}
	{#if friend.status_updated_at}
		<dialog
			id="status_modal_{friend.id}"
			class="modal modal-bottom sm:modal-middle"
			onclick={closeModal}
		>
			<div
				class="modal-box"
				onclick={stopPropagation}
				onkeydown={handleModalKeydown}
				role="dialog"
				tabindex="-1"
			>
				<p class="py-4">
					<strong>{getDisplayName(friend.display_name, friend.username)}</strong> updated their status
					on:
				</p>
				<p class="text-primary text-lg font-semibold">
					{formatStatusUpdatedAtTooltip(friend.status_updated_at)}
				</p>
				<div class="modal-action">
					<form method="dialog">
						<button class="btn">Close</button>
					</form>
				</div>
			</div>
		</dialog>
	{/if}
{/each}

<style>
	:global(.draggable-item) {
		transition:
			opacity 0.15s ease,
			transform 0.15s ease,
			box-shadow 0.15s ease;
		will-change: transform, opacity;
	}

	:global(.draggable-item:hover:not(.dragging)) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	:global(.draggable-item:active) {
		cursor: grabbing;
	}

	:global(.draggable-item.dragging) {
		transform: scale(1.02);
		transform-origin: center;
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
