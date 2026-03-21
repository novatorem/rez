<script lang="ts">
  import { onMount } from 'svelte';
  import { themeChange } from 'theme-change';
  import { themes } from './themes.js';
  import { toastStore } from './toast.js';

  let currentTheme = $state('light');
  let isLoading = $state(false);

  onMount(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    currentTheme = savedTheme;
    themeChange(false);
  });

  const updateTheme = async (theme: string) => {
    isLoading = true;
    try {
      currentTheme = theme;
      localStorage.setItem('theme', theme);
      const oneYear = 60 * 60 * 24 * 365;
      document.cookie = `theme=${theme}; max-age=${oneYear}; path=/; SameSite=Lax`;
      document.documentElement.setAttribute('data-theme', theme);
      themeChange(false);
      toastStore.success(`Theme changed to ${theme.charAt(0).toUpperCase() + theme.slice(1)}`);
    } catch {
      toastStore.error('Failed to update theme');
    } finally {
      isLoading = false;
    }
  };
</script>

<div title="Change Theme" class="dropdown dropdown-bottom w-full">
  <div
    tabindex="0"
    role="button"
    class="btn group btn-lg btn-ghost border-base-content/20 hover:border-base-content/35 w-full justify-between gap-3 border px-3"
    aria-label="Change Theme"
  >
    <div class="flex items-center gap-3">
      <div
        class="bg-base-100 group-hover:border-base-content/20 border-base-content/10 grid shrink-0 grid-cols-2 gap-0.5 rounded-md border p-1.5 transition-colors"
      >
        <div class="bg-base-content size-1.5 rounded-full"></div>
        <div class="bg-primary size-1.5 rounded-full"></div>
        <div class="bg-secondary size-1.5 rounded-full"></div>
        <div class="bg-accent size-1.5 rounded-full"></div>
      </div>
      <span class="text-lg font-medium capitalize">{currentTheme}</span>
    </div>
    <svg
      width="12px"
      height="12px"
      class="mt-px size-2 fill-current opacity-60"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 2048 2048"
    >
      <path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z"></path>
    </svg>
  </div>
  <div
    class="dropdown-content bg-base-200 text-base-content rounded-box border-base-content/20 h-[30.5rem] max-h-[calc(100dvh-8.6rem)] w-full overflow-y-auto border shadow-2xl"
  >
    <ul class="menu w-full">
      <li class="menu-title text-xs">Theme</li>
      {#each themes as theme (theme)}
        <li>
          <button
            class="w-full gap-3 px-3 py-2 {currentTheme === theme ? '[&_svg]:visible' : ''}"
            data-set-theme={theme}
            onclick={() => updateTheme(theme)}
            disabled={isLoading}
          >
            <div
              data-theme={theme}
              class="bg-base-100 grid shrink-0 grid-cols-2 gap-0.5 rounded-md p-1.5 shadow-sm"
            >
              <div class="bg-base-content size-1.5 rounded-full"></div>
              <div class="bg-primary size-1.5 rounded-full"></div>
              <div class="bg-secondary size-1.5 rounded-full"></div>
              <div class="bg-accent size-1.5 rounded-full"></div>
            </div>
            <div class="flex-1 truncate text-lg capitalize">{theme}</div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="invisible h-3 w-3 shrink-0"
            >
              <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"></path>
            </svg>
          </button>
        </li>
      {/each}
    </ul>
  </div>
</div>
