<script lang="ts">
</script>

<div class="card bg-base-200">
  <div class="card-body">
    <h2 class="card-title">Add Friends</h2>

    <div class="join mb-4 w-full">
      <div class="w-full">
        <div class="skeleton h-12 w-full"></div>
      </div>
      <div class="skeleton h-12 w-12"></div>
    </div>

    <div class="space-y-2">
      {#each Array.from({ length: 2 }, (_, i) => i) as i (i)}
        <div class="bg-base-300 rounded-box p-2">
          <div class="flex items-center justify-between">
            <div class="skeleton h-4 w-48"></div>
            <div class="join">
              <div class="skeleton h-10 w-10 sm:h-8 sm:w-8"></div>
              <div class="skeleton h-10 w-10 sm:h-8 sm:w-8"></div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
