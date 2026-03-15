<script lang="ts">
  import { invalidate } from '$app/navigation';
  import { page } from '$app/state';
  import Footer from '$lib/ui/Footer.svelte';
  import ToastContainer from '$lib/ui/ToastContainer.svelte';
  import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
  import { themeChange } from 'theme-change';
  import { fade } from 'svelte/transition';
  import '../app.css';

  let { data, children } = $props();
  let { session, supabase } = $derived(data);

  let pageTitle = $state('Rez');

  $effect(() => {
    const pathname = page.url.pathname;

    if (pathname === '/') {
      pageTitle = 'Rez - Connect with others';
    } else if (pathname.startsWith('/dashboard/settings')) {
      pageTitle = 'Settings - Rez';
    } else if (pathname.startsWith('/dashboard')) {
      pageTitle = 'Dashboard - Rez';
    } else if (pathname.startsWith('/auth')) {
      pageTitle = 'Authentication - Rez';
    } else {
      pageTitle = 'Rez';
    }
  });

  $effect(() => {
    themeChange(false);

    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        if (newSession?.expires_at !== session?.expires_at) {
          invalidate('supabase:auth');
        }

      if (event === 'PASSWORD_RECOVERY') {
        if (!window.location.pathname.startsWith('/auth/reset-password')) {
          window.location.href = '/auth/reset-password';
        }
      }

      if (event === 'SIGNED_OUT') {
        invalidate('supabase:auth');
        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth';
        }
      }
      }
    );

    return () => authListener.subscription.unsubscribe();
  });
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<div class="bg-base-100 flex min-h-screen flex-col">
  <main class="flex grow flex-col">
    {#key page.url.pathname}
      <div in:fade={{ duration: 200, delay: 60 }} class="flex grow flex-col">
        {@render children()}
      </div>
    {/key}
  </main>

  {#if !page.url.pathname.startsWith('/dashboard')}
    <Footer />
  {/if}
  <ToastContainer />
</div>
