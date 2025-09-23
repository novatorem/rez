<script lang="ts">
	import {
		formatStatusUpdatedAt,
		formatStatusUpdatedAtTooltip,
		getDisplayName
	} from '$lib/dashboard-utils';

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
	}

	let { friends, deletingFriends, onDeleteFriend }: Props = $props();

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
</script>

<div class="card bg-base-200">
	<div class="card-body">
		<h2 class="card-title">My Friends</h2>
		<ul class="list">
			{#if friends && friends.length > 0}
				{#each friends as friend (friend.id)}
					<li class="bg-base-300 rounded-box group mb-3 p-4">
						<div class="flex w-full items-start gap-3">
							<!-- Avatar and Delete Button Container -->
							<div class="flex flex-shrink-0 flex-col items-center gap-2">
								<!-- Avatar -->
								<div class="avatar avatar-placeholder">
									<div class="bg-neutral text-neutral-content w-12 rounded-full">
										<span>
											{getDisplayName(friend.display_name, friend.username).charAt(0).toUpperCase()}
										</span>
									</div>
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
									<div class="min-w-0">
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
					</li>
				{/each}
			{:else}
				<li class="list-row">No friends yet. Send some requests!</li>
			{/if}
		</ul>
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
