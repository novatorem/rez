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

<!-- Friend Deletion Confirmation Modal -->
<dialog open={showDeleteModal} class="modal modal-bottom sm:modal-middle">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Remove Friend</h3>
		<p class="py-4">
			Are you sure you want to remove <strong>{friendToDelete?.name}</strong> from your friends list?
			This action cannot be undone.
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
