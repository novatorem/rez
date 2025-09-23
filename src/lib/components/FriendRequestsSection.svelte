<script lang="ts">
	import { getDisplayName } from '$lib/dashboard-utils';
	import type { EventHandler } from 'svelte/elements';

	interface FriendRequest {
		id: string;
		requester_display_name: string | null;
		requester_username: string;
	}

	interface SentFriendRequest {
		id: string;
		target_display_name: string | null;
		target_username: string;
	}

	interface Props {
		friendRequests: FriendRequest[];
		sentFriendRequests: SentFriendRequest[];
		isSendingFriendRequest: boolean;
		processingRequests: Set<string>;
		cancellingRequests: Set<string>;
		onFriendRequest: EventHandler<SubmitEvent, HTMLFormElement>;
		onFriendRequestAction: (requestId: string, action: 'accept' | 'reject') => void;
		onCancelFriendRequest: (requestId: string) => void;
	}

	let {
		friendRequests,
		sentFriendRequests,
		isSendingFriendRequest,
		processingRequests,
		cancellingRequests,
		onFriendRequest,
		onFriendRequestAction,
		onCancelFriendRequest
	}: Props = $props();
</script>

<div class="card bg-base-200">
	<div class="card-body">
		<h2 class="card-title">Friend Requests</h2>

		<form onsubmit={onFriendRequest} class="mb-4">
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
							title="Must start with a letter, then letters, numbers, dots, dashes, or underscores"
						/>
					</label>
				</div>
				<button class="btn btn-neutral join-item" disabled={isSendingFriendRequest}>
					{#if isSendingFriendRequest}
						<span class="loading loading-spinner loading-sm"></span>
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
							><path
								fill="none"
								stroke="currentColor"
								stroke-dasharray="16"
								stroke-dashoffset="16"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 3c4.97 0 9 4.03 9 9"
								><animate
									fill="freeze"
									attributeName="stroke-dashoffset"
									dur="0.2s"
									values="16;0"
								/><animateTransform
									attributeName="transform"
									dur="1.5s"
									repeatCount="indefinite"
									type="rotate"
									values="0 12 12;360 12 12"
								/></path
							></svg
						>
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

		<!-- Pending Friend Requests -->
		{#if friendRequests && friendRequests.length > 0}
			<h3 class="mt-4 font-bold">Friend Requests</h3>
			<ul class="list">
				{#each friendRequests as request (request.id)}
					<li class="bg-base-300 rounded-box mb-2 p-2">
						<div class="flex w-full items-center justify-between">
							<div class="flex flex-col">
								<span
									>{getDisplayName(request.requester_display_name, request.requester_username)} wants
									to be your friend</span
								>
								{#if request.requester_display_name}
									<span class="text-base-content/60 text-xs">@{request.requester_username}</span>
								{/if}
							</div>
							<div class="join">
								<button
									class="btn btn-sm btn-success join-item"
									onclick={() => onFriendRequestAction(request.id, 'accept')}
									disabled={processingRequests.has(request.id)}
								>
									{#if processingRequests.has(request.id)}
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
												d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									{/if}
								</button>
								<button
									class="btn btn-sm btn-error join-item"
									onclick={() => onFriendRequestAction(request.id, 'reject')}
									disabled={processingRequests.has(request.id)}
								>
									{#if processingRequests.has(request.id)}
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
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		<!-- Sent Friend Requests -->
		{#if sentFriendRequests && sentFriendRequests.length > 0}
			<h3 class="mt-4 font-bold">Sent Friend Requests</h3>
			<ul class="list">
				{#each sentFriendRequests as request (request.id)}
					<li class="bg-base-300 rounded-box group mb-2 p-2">
						<div class="flex w-full items-center justify-between">
							<div class="flex flex-col">
								<span>{getDisplayName(request.target_display_name, request.target_username)}</span>
								{#if request.target_display_name}
									<span class="text-base-content/60 text-xs">@{request.target_username}</span>
								{/if}
							</div>
							<button
								class="btn btn-sm btn-error"
								onclick={() => onCancelFriendRequest(request.id)}
								disabled={cancellingRequests.has(request.id)}
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
