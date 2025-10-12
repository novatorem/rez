<script lang="ts">
	import { MAX_STATUS_LENGTH } from '$lib/dashboard-utils';
	import type { QuickStatus } from '$lib/quick-status-store';
	import type { EventHandler } from 'svelte/elements';

	interface Props {
		currentStatus: string;
		isUpdatingStatus: boolean;
		onStatusUpdate: EventHandler<SubmitEvent, HTMLFormElement>;
		statusInputText: string;
		quickStatuses: QuickStatus[];
	}

	let {
		currentStatus,
		isUpdatingStatus,
		onStatusUpdate,
		statusInputText = $bindable(),
		quickStatuses
	}: Props = $props();

	let statusCharacterCount = $derived(statusInputText.length);
	let selectedQuickStatusId = $state<string>('');

	const handleQuickStatusChange = (statusText: string, statusId: string) => {
		statusInputText = statusText;
		selectedQuickStatusId = statusId;
	};

	const resetQuickStatus = () => {
		selectedQuickStatusId = '';
	};
</script>

<div class="card bg-base-200">
	<div class="card-body">
		<h2 class="card-title">Status</h2>

		<form onsubmit={onStatusUpdate} class="mb-4">
			<div class="join w-full">
				<div class="w-full">
					<input
						type="text"
						class="input join-item w-full {statusCharacterCount > MAX_STATUS_LENGTH
							? 'input-error'
							: ''}"
						placeholder="What are you up to?"
						bind:value={statusInputText}
						maxlength={MAX_STATUS_LENGTH}
						required
						title="Status message"
					/>
					<div class="validator-hint {statusCharacterCount > MAX_STATUS_LENGTH ? '' : 'hidden'}">
						{statusCharacterCount}/{MAX_STATUS_LENGTH} characters
						{statusCharacterCount > MAX_STATUS_LENGTH ? ' - Status too long!' : ''}
					</div>
				</div>
				<button class="btn btn-neutral join-item" disabled={isUpdatingStatus}>
					{#if isUpdatingStatus}
						<span class="loading loading-spinner loading-sm"></span>
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
							><g
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								><path
									d="M15 3.512a9.03 9.03 0 0 1 5.5 5.523M11 3.055a9 9 0 0 0-6.605 13.76L3 21l4.185-1.395A9 9 0 0 0 20.945 13"
								/><path d="M12 17a5 5 0 0 1-5-5m2-4a5 5 0 0 1 7 7" /><circle
									cx="12"
									cy="12"
									r="1"
								/></g
							></svg
						>
					{/if}
				</button>
			</div>
		</form>

		{#if quickStatuses.length > 0}
			<div class="mb-4">
				<div class="label">
					<span class="label-text text-sm font-medium">Quick Status</span>
				</div>
				<form class="filter">
					<input
						class="btn btn-square btn-sm"
						type="reset"
						value="×"
						onclick={resetQuickStatus}
						title="Clear selection"
					/>
					{#each quickStatuses as quickStatus (quickStatus.id)}
						<input
							class="btn btn-sm"
							type="radio"
							name="quick-status"
							aria-label={quickStatus.status_text}
							checked={selectedQuickStatusId === quickStatus.id}
							onchange={() => handleQuickStatusChange(quickStatus.status_text, quickStatus.id)}
						/>
					{/each}
				</form>
			</div>
		{/if}

		{#if currentStatus}
			<div class="label">
				<span class="label-text text-sm font-medium">Current Status</span>
			</div>
			<div class="bg-base-300 rounded-lg p-3">
				<p class="overflow-wrap-anywhere text-lg break-words">{currentStatus}</p>
			</div>
		{/if}
	</div>
</div>
