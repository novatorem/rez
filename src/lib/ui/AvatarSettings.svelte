<script lang="ts">
  import Avatar from 'svelte-boring-avatars';
  import { avatarSettings, type AvatarVariant } from '$lib/stores/avatar.svelte';

  const variants: AvatarVariant[] = ['beam', 'marble', 'pixel', 'sunset', 'bauhaus', 'ring'];

  let previewSeed = $state('Preview');

  let previewName = $derived(previewSeed.trim() || 'Preview');

  function handleColorChange(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const newColors = [...avatarSettings.colors];
    newColors[index] = input.value;
    avatarSettings.updateColors(newColors);
  }

  function randomizeColors() {
    const newColors = Array.from({ length: 5 }, () => {
      const randomColor = Math.floor(Math.random() * 16777215).toString(16);
      return `#${randomColor.padStart(6, '0')}`;
    });
    avatarSettings.updateColors(newColors);
  }

  function handleVariantChange(variant: AvatarVariant) {
    avatarSettings.updateVariant(variant);
  }
</script>

<div class="space-y-6">
  <div class="border-base-300 flex items-center gap-4 border-b pb-2">
    <h3 class="text-base-content/80 text-lg font-semibold">Avatar Style</h3>
  </div>

  <div class="flex flex-col gap-6 sm:flex-row">
    <div class="bg-base-300 flex flex-1 flex-col justify-center gap-4 rounded-lg p-6">
      <div class="avatar mx-auto">
        <Avatar
          name={previewName}
          size={120}
          variant={avatarSettings.variant}
          colors={avatarSettings.colors}
        />
      </div>
      <input
        id="avatar-preview-seed"
        type="text"
        bind:value={previewSeed}
        class="input input-bordered input-sm mx-auto w-full max-w-xs text-center font-mono text-sm"
        placeholder="Preview"
        maxlength={200}
        autocomplete="off"
        spellcheck="false"
        aria-label="Avatar preview seed (same string used to generate each friend’s avatar)"
      />
    </div>

    <div class="flex-2 space-y-6">
      <div class="form-control" role="group" aria-labelledby="variant-label">
        <div id="variant-label" class="label pt-0">
          <span class="label-text font-medium">Variant</span>
        </div>
        <div class="flex flex-wrap gap-2">
          {#each variants as variant (variant)}
            <button
              class="btn btn-sm capitalize {avatarSettings.variant === variant
                ? 'btn-primary'
                : 'btn-outline'}"
              onclick={() => handleVariantChange(variant)}
              type="button"
            >
              {variant}
            </button>
          {/each}
        </div>
      </div>

      <div class="form-control" role="group" aria-labelledby="colors-label">
        <div id="colors-label" class="label pt-0">
          <span class="label-text font-medium">Colors</span>
        </div>
        <div class="mb-2 flex flex-wrap items-center gap-2">
          {#each avatarSettings.colors as color, index (index)}
            <label
              class="btn btn-sm btn-square relative shrink-0 cursor-pointer gap-0 overflow-hidden p-0 transition-transform active:scale-[0.98]"
            >
              <input
                type="color"
                value={color}
                onchange={(e) => handleColorChange(index, e)}
                class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                aria-label="Color {index + 1}"
                title="Color {index + 1}"
              />
              <span
                class="pointer-events-none absolute inset-0 block"
                style="background-color: {color}"
              ></span>
            </label>
          {/each}
        </div>
        <button class="btn btn-sm btn-outline mt-2 w-fit" onclick={randomizeColors} type="button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="shrink-0"
            aria-hidden="true"
          >
            <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
            <path d="m18 2 4 4-4 4" />
            <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
            <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.9-1.2" />
            <path d="m18 14 4 4-4 4" />
          </svg>
          Randomize Colors
        </button>
      </div>
    </div>
  </div>
</div>
