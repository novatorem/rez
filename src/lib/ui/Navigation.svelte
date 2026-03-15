<script lang="ts">
  import type { SupabaseClient } from '@supabase/supabase-js';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { getHasUnseen } from '$lib/friends/pendingCount.svelte.js';

  let { supabase }: { supabase: SupabaseClient | null } = $props();

  const logout = async () => {
    if (!supabase) return;

    try {
      await supabase.auth.signOut();

      const response = await fetch('/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        window.location.href = '/auth';
      } else {
        window.location.href = '/auth';
      }
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/auth';
    }
  };
</script>

<nav class="navbar bg-base-200 sticky top-0 z-50 shadow-lg">
  <div class="navbar-start">
    <a href={resolve('/dashboard')} class="btn btn-ghost text-primary text-sm font-bold uppercase tracking-[0.2em]">Rez</a>
  </div>
  <div class="navbar-end">
    <div class="dropdown dropdown-end">
      <div class="indicator">
      <button aria-label="Dropdown menu" tabindex="0" class="btn btn-ghost">
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16m-7 6h7"
          /></svg
        >
      </button>
      {#if getHasUnseen()}
        <span class="badge badge-error badge-xs indicator-item" aria-label="New friend request"></span>
      {/if}
      </div>
      <ul class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-44 p-2 shadow sm:w-52">
        <li>
          <a href={resolve('/dashboard/friends')}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Friends
            {#if getHasUnseen()}
              <span class="badge badge-error badge-xs" aria-label="New friend request"></span>
            {/if}
          </a>
        </li>
        <li>
          <a href={resolve('/dashboard/settings')}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Settings
          </a>
        </li>
        <li>
          <button class="text-error" onclick={logout}>Log out</button>
        </li>
      </ul>
    </div>
  </div>
</nav>
