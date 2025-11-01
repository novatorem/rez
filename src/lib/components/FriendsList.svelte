<script lang="ts">
	import {
		formatStatusUpdatedAt,
		formatStatusUpdatedAtTooltip,
		getDisplayName
	} from '$lib/dashboard-utils';
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

	// Keyboard handler for accessibility
	function handleDragKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			// Could add keyboard-based reordering here in the future
		}
	}

	// Function to open the status date modal
	function openStatusModal(friend: Friend) {
		const modal = document.getElementById(`status_modal_${friend.id}`) as HTMLDialogElement;
		modal?.showModal();
	}

	// Function to close modal when clicking outside
	function closeModal(event: MouseEvent) {
		const target = event.target as HTMLDialogElement;
		if (target.tagName === 'DIALOG') {
			target.close();
		}
	}

	// Function to stop propagation when clicking inside modal content
	function stopPropagation(event: Event) {
		event.stopPropagation();
	}

	// Function to handle keyboard events for modal content
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.stopPropagation();
		}
	}

	// Drag and drop state
	let draggedFriend: Friend | null = $state(null);
	let draggedIndex: number = $state(-1);
	let dragOverIndex: number = $state(-1);

	// Touch drag state
	let containerRef: HTMLDivElement | null = $state(null);
	let activatedIndex: number = $state(-1); // Item activated for dragging (first touch)
	let touchStartY: number = $state(0);
	let touchStartTime: number = $state(0);

	// Check if device supports touch
	function isTouchDevice(): boolean {
		return (
			typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
		);
	}

	// Action to attach non-passive touch event listeners
	function touchDragAction(
		element: HTMLElement,
		params: [Friend, number] | undefined
	): { update?: (params: [Friend, number] | undefined) => void; destroy?: () => void } {
		// Track if listeners are attached
		let listenersAttached = false;
		let currentFriend: Friend | null = null;
		let currentIndex: number = -1;

		// Handler functions that use the current values
		function onTouchStart(event: TouchEvent) {
			if (currentIndex !== -1 && currentFriend) {
				clearActivationOnTouch(currentIndex);
				handleTouchStart(event, currentFriend, currentIndex);
			}
		}

		function onTouchMove(event: TouchEvent) {
			handleTouchMove(event);
		}

		function onTouchEnd(event: TouchEvent) {
			if (currentIndex !== -1) {
				handleTouchEnd(event, currentIndex);
			}
		}

		function onTouchCancel() {
			handleTouchCancel();
		}

		function attachListeners() {
			if (!listenersAttached) {
				element.addEventListener('touchstart', onTouchStart, { passive: false });
				element.addEventListener('touchmove', onTouchMove, { passive: false });
				element.addEventListener('touchend', onTouchEnd, { passive: false });
				element.addEventListener('touchcancel', onTouchCancel, { passive: false });
				listenersAttached = true;
			}
		}

		function cleanup() {
			if (listenersAttached) {
				element.removeEventListener('touchstart', onTouchStart);
				element.removeEventListener('touchmove', onTouchMove);
				element.removeEventListener('touchend', onTouchEnd);
				element.removeEventListener('touchcancel', onTouchCancel);
				listenersAttached = false;
			}
		}

		// Initialize if params are provided
		if (params) {
			const [friend, index] = params;
			currentFriend = friend;
			currentIndex = index;
			attachListeners();
		}

		return {
			update(newParams: [Friend, number] | undefined) {
				if (!newParams) {
					cleanup();
					currentFriend = null;
					currentIndex = -1;
					return;
				}

				const [newFriend, newIndex] = newParams;

				// Attach listeners if they weren't attached before
				if (!listenersAttached) {
					attachListeners();
				}

				// Update references - the existing handlers will use the updated values via closure
				currentFriend = newFriend;
				currentIndex = newIndex;
			},
			destroy: cleanup
		};
	}

	// Function to handle drag start
	function handleDragStart(event: DragEvent, friend: Friend, index: number) {
		draggedFriend = friend;
		draggedIndex = index;

		// Set drag data
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', friend.id);
		}
	}

	// Function to handle drag over
	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		dragOverIndex = index;
	}

	// Function to handle drag leave
	function handleDragLeave() {
		dragOverIndex = -1;
	}

	// Function to handle drop
	function handleDrop(event: DragEvent, targetIndex: number) {
		event.preventDefault();

		if (!draggedFriend || draggedIndex === -1) return;

		// Don't do anything if dropping on the same position
		if (draggedIndex === targetIndex) {
			draggedFriend = null;
			draggedIndex = -1;
			return;
		}

		// Create a new array with the reordered friends
		const newFriends = [...friends];
		const [movedFriend] = newFriends.splice(draggedIndex, 1);
		newFriends.splice(targetIndex, 0, movedFriend);

		// Update the local friends array
		friends = newFriends;

		// Notify parent component about the reorder
		onReorderFriends?.(newFriends);

		// Reset drag state
		draggedFriend = null;
		draggedIndex = -1;
	}

	// Function to handle drag end
	function handleDragEnd() {
		draggedFriend = null;
		draggedIndex = -1;
		dragOverIndex = -1;
	}

	// Touch drag handlers
	function handleTouchStart(event: TouchEvent, friend: Friend, index: number) {
		if (!isTouchDevice()) return;

		const touch = event.touches[0];
		touchStartY = touch.clientY;
		touchStartTime = Date.now();

		// If this item is already activated, start dragging
		if (activatedIndex === index) {
			event.preventDefault();
			draggedFriend = friend;
			draggedIndex = index;
		} else {
			// Activate this item for dragging (first touch)
			activatedIndex = index;
			// Don't prevent default here - allow normal interaction
		}
	}

	function handleTouchMove(event: TouchEvent) {
		if (!isTouchDevice()) return;

		const touch = event.touches[0];
		const currentY = touch.clientY;
		const moveDistance = Math.abs(currentY - touchStartY);

		// If an item is activated but not yet dragging, check if we've moved enough to start dragging
		if (activatedIndex !== -1 && draggedIndex === -1) {
			// If moved more than 10px, start dragging
			if (moveDistance > 10) {
				const activatedFriend = friends[activatedIndex];
				if (activatedFriend) {
					draggedFriend = activatedFriend;
					draggedIndex = activatedIndex;
					// Now we're dragging, prevent default and continue with drag logic
					event.preventDefault();
				} else {
					return;
				}
			} else {
				// Not enough movement yet, don't prevent default - allow scrolling
				return;
			}
		}

		// Only proceed with drag logic if we're actually dragging
		if (draggedIndex === -1) return;

		event.preventDefault();

		// Find which element we're over based on position
		if (!containerRef) return;

		const elements = containerRef.querySelectorAll('.draggable-item');
		let targetIndex = draggedIndex;

		// Find the element directly under the touch point
		for (let i = 0; i < elements.length; i++) {
			if (i === draggedIndex) continue; // Skip the dragged element

			const el = elements[i] as HTMLElement;
			const rect = el.getBoundingClientRect();

			// Check if touch is within this element's vertical bounds
			if (currentY >= rect.top && currentY <= rect.bottom) {
				const centerY = rect.top + rect.height / 2;
				// If touch is in the lower half, insert after this element
				if (currentY >= centerY) {
					targetIndex = i + 1;
				} else {
					// If touch is in the upper half, insert before this element
					targetIndex = i;
				}
				break;
			}
			// If touch is above all elements
			else if (currentY < rect.top) {
				targetIndex = i;
				break;
			}
		}

		// If touch is below all elements, insert at the end
		if (targetIndex === draggedIndex) {
			const lastElement = elements[elements.length - 1] as HTMLElement;
			if (lastElement && currentY > lastElement.getBoundingClientRect().bottom) {
				targetIndex = elements.length - 1;
			}
		}

		// Clamp targetIndex to valid range
		targetIndex = Math.max(0, Math.min(targetIndex, elements.length - 1));

		// Adjust if we're moving past the dragged index
		if (targetIndex > draggedIndex) {
			targetIndex = Math.min(targetIndex, elements.length - 1);
		} else {
			targetIndex = Math.max(0, targetIndex);
		}

		dragOverIndex = targetIndex;
	}

	function handleTouchEnd(event: TouchEvent, targetIndex: number) {
		if (!isTouchDevice()) return;

		// If we were just activated but didn't drag, check if it was a tap
		if (activatedIndex !== -1 && draggedIndex === -1) {
			const touchDuration = Date.now() - touchStartTime;
			const touch = event.changedTouches[0];
			const moveDistance = touch ? Math.abs(touch.clientY - touchStartY) : 0;

			// If it was a quick tap with little movement, deactivate after a delay
			if (touchDuration < 300 && moveDistance < 10) {
				// Keep activated for now - user might want to drag next time
				// Or clear after a timeout
				setTimeout(() => {
					if (draggedIndex === -1 && activatedIndex !== -1) {
						activatedIndex = -1;
					}
				}, 2000); // Clear activation after 2 seconds if no drag started
			}
			return;
		}

		if (draggedIndex === -1) return;

		event.preventDefault();

		if (!draggedFriend || draggedIndex === -1) return;

		// Use the dragOverIndex if it's valid, otherwise use the targetIndex
		let finalTargetIndex = dragOverIndex !== -1 ? dragOverIndex : targetIndex;

		// Adjust target index if moving down (we need to account for the removed item)
		if (finalTargetIndex > draggedIndex) {
			finalTargetIndex--;
		}

		// Don't do anything if dropping on the same position
		if (draggedIndex === finalTargetIndex) {
			draggedFriend = null;
			draggedIndex = -1;
			dragOverIndex = -1;
			return;
		}

		// Create a new array with the reordered friends
		const newFriends = [...friends];
		const [movedFriend] = newFriends.splice(draggedIndex, 1);
		newFriends.splice(finalTargetIndex, 0, movedFriend);

		// Update the local friends array
		friends = newFriends;

		// Notify parent component about the reorder
		onReorderFriends?.(newFriends);

		// Reset drag state
		draggedFriend = null;
		draggedIndex = -1;
		dragOverIndex = -1;
		activatedIndex = -1;
		touchStartY = 0;
		touchStartTime = 0;
	}

	function handleTouchCancel() {
		draggedFriend = null;
		draggedIndex = -1;
		dragOverIndex = -1;
		activatedIndex = -1;
		touchStartY = 0;
		touchStartTime = 0;
	}

	// Clear activation when touching a different item
	function clearActivationOnTouch(index: number) {
		if (activatedIndex !== -1 && activatedIndex !== index && draggedIndex === -1) {
			activatedIndex = -1;
		}
	}
</script>

<div class="card bg-base-200">
	<div class="card-body">
		<h2 class="card-title">My Friends</h2>
		<div class="space-y-3" bind:this={containerRef}>
			{#if friends && friends.length > 0}
				{#each friends as friend, index (friend.id)}
					<div
						class="draggable-item bg-base-300 rounded-box group cursor-move p-4 transition-all duration-200 hover:shadow-md {dragOverIndex ===
						index
							? 'drag-over-highlight bg-primary/10'
							: ''} {draggedIndex === index ? 'dragging opacity-50' : ''} {activatedIndex ===
							index && draggedIndex === -1
							? 'activated'
							: ''}"
						use:touchDragAction={isTouchDevice() ? [friend, index] : undefined}
						draggable={!isTouchDevice()}
						role="button"
						tabindex="0"
						onkeydown={handleDragKeydown}
						ondragstart={(e) => handleDragStart(e, friend, index)}
						ondragover={(e) => handleDragOver(e, index)}
						ondragleave={handleDragLeave}
						ondrop={(e) => handleDrop(e, index)}
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
				onkeydown={handleKeydown}
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
	/* Custom drag and drop styles */
	:global(.svelte-dnd-dragging) {
		opacity: 0.5;
		transform: rotate(2deg);
		z-index: 1000;
	}

	:global(.svelte-dnd-drop-target) {
		background-color: hsl(var(--p) / 0.1);
		border: 2px dashed hsl(var(--p));
	}

	/* Smooth transitions for drag states */
	:global(.draggable-item) {
		transition: all 0.2s ease-in-out;
		/* Prevent layout shifts from transforms */
		will-change: transform, opacity;
	}

	:global(.draggable-item:hover:not(.dragging)) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	/* Drag feedback styles */
	:global(.draggable-item:active) {
		cursor: grabbing;
	}

	/* Dragging state - use transform to avoid layout shifts */
	/* Using higher specificity to ensure it overrides hover */
	:global(.draggable-item.dragging) {
		transform: scale(1.05) !important;
		/* Use transform-origin to keep scaling centered */
		transform-origin: center;
	}

	/* Drag over highlight - use box-shadow instead of ring to avoid layout shifts */
	:global(.drag-over-highlight) {
		box-shadow: 0 0 0 2px hsl(var(--p) / 0.5);
	}

	/* Activated state - visual feedback when item is ready to drag */
	:global(.draggable-item.activated) {
		box-shadow: 0 0 0 1px hsl(var(--p) / 0.3);
		background-color: hsl(var(--b3) / 1);
	}

	/* Touch drag - prevent scrolling during drag */
	@media (hover: none) and (pointer: coarse) {
		:global(.draggable-item) {
			touch-action: pan-y;
		}

		:global(.draggable-item.dragging) {
			touch-action: none;
		}
	}

	/* Prevent text selection during touch drag */
	:global(.dragging) {
		user-select: none;
		-webkit-user-select: none;
	}

	/* Hide drag handle on non-touch devices */
	@media (hover: hover) and (pointer: fine) {
		:global(.touch-drag-handle) {
			display: none;
		}
	}
</style>
