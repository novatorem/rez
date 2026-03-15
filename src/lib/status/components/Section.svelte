<script lang="ts">
  import type { QuickStatus } from '$lib/status/quick';
  import { MAX_STATUS_LENGTH } from '$lib/status/validation';
  import { cubicOut } from 'svelte/easing';
  import type { EventHandler } from 'svelte/elements';
  import { fly } from 'svelte/transition';

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

  let selectedQuickStatusId = $state<string>('');
  let showQuickStatuses = $state(false);
  let showSuccess = $state(false);
  let successTimer: ReturnType<typeof setTimeout> | null = null;

  let statusCharacterCount = $derived(statusInputText?.length ?? 0);
  // Show counter only when within 14 chars of the limit - enough notice, no noise otherwise
  let showCounter = $derived(statusCharacterCount >= MAX_STATUS_LENGTH - 14);
  let charsRemaining = $derived(MAX_STATUS_LENGTH - statusCharacterCount);

  // Track currentStatus changes to flash a success checkmark on the submit button
  let prevStatus: string | undefined;
  $effect(() => {
    if (prevStatus !== undefined && currentStatus !== prevStatus) {
      if (successTimer) clearTimeout(successTimer);
      showSuccess = true;
      successTimer = setTimeout(() => {
        showSuccess = false;
      }, 700);
    }
    prevStatus = currentStatus;
  });

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
    <div class="mb-3 flex items-center justify-between">
      <h2 class="card-title">Right now</h2>
      {#if quickStatuses.length > 0}
        <button
          type="button"
          class="btn btn-ghost btn-xs text-base-content/40 hover:text-base-content/60 gap-1"
          onclick={() => {
            showQuickStatuses = !showQuickStatuses;
          }}
          aria-expanded={showQuickStatuses}
          aria-label={showQuickStatuses ? 'Hide quick statuses' : 'Show quick statuses'}
        >
          <span>Quick</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3 w-3 transition-transform duration-200 {showQuickStatuses
              ? 'rotate-180'
              : ''}"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg
          >
        </button>
      {/if}
    </div>

    {#if showQuickStatuses && quickStatuses.length > 0}
      <form transition:fly={{ y: 8, duration: 180, easing: cubicOut }} class="flex-wrap filter">
        {#if selectedQuickStatusId}
          <input
            class="btn btn-square sm:btn-sm"
            type="reset"
            value="×"
            onclick={resetQuickStatus}
            aria-label="Clear selection"
            title="Clear selection"
          />
        {/if}
        {#each quickStatuses as quickStatus (quickStatus.id)}
          <input
            class="btn sm:btn-sm"
            type="radio"
            name="quick-status"
            aria-label={quickStatus.status_text}
            checked={selectedQuickStatusId === quickStatus.id}
            onchange={() => handleQuickStatusChange(quickStatus.status_text, quickStatus.id)}
          />
        {/each}
      </form>
    {/if}

    <form onsubmit={onStatusUpdate}>
      <div class="join w-full">
        <div class="relative w-full">
          <input
            type="text"
            class="input join-item w-full pr-9 {statusCharacterCount > MAX_STATUS_LENGTH
              ? 'input-error'
              : ''}"
            placeholder="What are you up to?"
            bind:value={statusInputText}
            maxlength={MAX_STATUS_LENGTH}
            required
          />
          {#if showCounter}
            <span
              transition:fly={{ x: 4, duration: 140, easing: cubicOut }}
              class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs tabular-nums select-none {charsRemaining <
              0
                ? 'text-error'
                : 'text-base-content/35'}">{charsRemaining}</span
            >
          {/if}
        </div>
        <button
          class="btn btn-primary join-item"
          disabled={isUpdatingStatus}
          aria-label="Update status"
        >
          {#if isUpdatingStatus}
            <span class="loading loading-spinner loading-sm"></span>
          {:else if showSuccess}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="animate-status-reveal"
              aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg
            >
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

    {#if currentStatus}
      {#key currentStatus}
        <div class="bg-base-300 animate-status-reveal mt-4 rounded-lg p-3">
          <p class="text-lg break-words">{currentStatus}</p>
        </div>
      {/key}
    {/if}
  </div>
</div>
