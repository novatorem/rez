<script lang="ts">
  import { formatStatusUpdatedAt } from '$lib/status/formatting';
  import { getNow, subscribeToTick } from './now.svelte.js';

  interface Props {
    timestamp: string | null;
  }

  let { timestamp }: Props = $props();

  $effect(() => {
    return subscribeToTick();
  });

  let display = $derived.by(() => {
    void getNow();
    return formatStatusUpdatedAt(timestamp);
  });
</script>

{display}
