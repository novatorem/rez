<script lang="ts">
  interface Props {
    showDeleteModal: boolean;
    friendToDelete: { id: string; name: string } | null;
    deletingFriends: Set<string>;
    onConfirmDelete: () => void;
    onCancelDelete: () => void;
  }

  let { showDeleteModal, friendToDelete, deletingFriends, onConfirmDelete, onCancelDelete }: Props =
    $props();
</script>

<dialog open={showDeleteModal} class="modal modal-bottom sm:modal-middle">
  <div class="modal-box animate-modal-in">
    <h3 class="text-lg font-bold">Remove {friendToDelete?.name}?</h3>
    <p class="py-4">
      They'll be removed from your friends list. You can add each other again any time.
    </p>
    <div class="modal-action">
      <button
        class="btn btn-error"
        onclick={onConfirmDelete}
        disabled={friendToDelete ? deletingFriends.has(friendToDelete.id) : false}
      >
        {#if friendToDelete && deletingFriends.has(friendToDelete.id)}
          <span class="loading loading-spinner loading-sm"></span>
          Removing...
        {:else}
          Remove Friend
        {/if}
      </button>
      <button class="btn" onclick={onCancelDelete}> Cancel </button>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
