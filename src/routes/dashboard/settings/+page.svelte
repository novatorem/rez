<script lang="ts">
  import { dev } from '$app/environment';
  import { DashboardDataLoader, type DashboardData } from '$lib/dashboard/loader';
  import { checkUsernameAvailability } from '$lib/profile/api';
  import {
    ERROR_MESSAGES,
    MAX_DISPLAY_NAME_LENGTH,
    MAX_USERNAME_LENGTH,
    sanitizeDisplayName,
    sanitizeUsername,
    validateDisplayName,
    validateUsername
  } from '$lib/profile/validation';
  import { getQuickStatuses, saveQuickStatuses } from '$lib/status/quick';
  import { MAX_STATUS_LENGTH, validateStatus } from '$lib/status/validation';
  import { handleDatabaseError } from '$lib/ui/notifications';
  import ThemeSelect from '$lib/ui/ThemeSelect.svelte';
  import AvatarSettings from '$lib/ui/AvatarSettings.svelte';
  import { toastStore } from '$lib/ui/toast';
  import { onMount } from 'svelte';

  let { data } = $props();
  let { session, supabase } = $derived(data);

  let isLoading = $state(false);

  let dashboardData = $state<DashboardData | null>(null);
  let isLoadingData = $state(true);
  let currentUsername = $derived(dashboardData?.currentUsername || '');
  let currentDisplayName = $derived(dashboardData?.currentDisplayName || null);
  let usernameText = $derived(currentUsername || '');
  let displayNameText = $derived(currentDisplayName || '');
  let isUpdatingUsername = $state(false);
  let isUpdatingDisplayName = $state(false);
  let usernameCharacterCount = $derived(usernameText.length);
  let displayNameCharacterCount = $derived(displayNameText.length);

  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmNewPassword = $state('');
  let isChangingPassword = $state(false);

  let newEmail = $state('');
  let isChangingEmail = $state(false);
  let emailChangeSuccess = $state<string | null>(null);

  let showDeleteModal = $state(false);
  let deletePassword = $state('');
  let isDeletingAccount = $state(false);

  let quickStatusInputs = $state<string[]>([]);
  let isUpdatingQuickStatuses = $state(false);

  onMount(() => {
    if (session?.user && supabase) {
      loadDashboardData();
    }
  });

  const loadDashboardData = async () => {
    if (!session?.user || !supabase) return;

    isLoadingData = true;
    try {
      const dataLoader = new DashboardDataLoader(supabase, session.user.id);
      dashboardData = await dataLoader.loadAllData();
      const localQuickStatuses = getQuickStatuses();
      quickStatusInputs = localQuickStatuses.map((qs) => qs.status_text);
      while (quickStatusInputs.length < 5) {
        quickStatusInputs.push('');
      }
    } catch (error) {
      handleDatabaseError(error, 'load dashboard data');
    } finally {
      isLoadingData = false;
    }
  };

  function downloadJsonFile(data: unknown, filename: string) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const exportData = async () => {
    if (!session?.user || !supabase) {
      toastStore.error('Please sign in again to export your data.');
      return;
    }

    try {
      isLoading = true;
      toastStore.info('Preparing your data export...');

      const dataLoader = new DashboardDataLoader(supabase, session.user.id);
      const exportedData = await dataLoader.exportUserData();

      downloadJsonFile(
        exportedData,
        `rez-data-export-${new Date().toISOString().split('T')[0]}.json`
      );

      toastStore.success('Data exported.');
    } catch (error) {
      console.error('Export error:', error);
      handleDatabaseError(error, 'export data');
    } finally {
      isLoading = false;
    }
  };

  const deleteAccount = () => {
    showDeleteModal = true;
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      toastStore.error('Enter your password to confirm deletion.');
      return;
    }

    if (!session?.user || !supabase) {
      toastStore.error('Please sign in again to delete your account.');
      return;
    }

    isDeletingAccount = true;
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: session.user.email!,
        password: deletePassword
      });

      if (authError) {
        toastStore.error('Invalid password. Please try again.');
        return;
      }

      const dataLoader = new DashboardDataLoader(supabase, session.user.id);
      await dataLoader.deleteUserAccount();

      toastStore.success('Account deleted. Signing you out...');

      await supabase.auth.signOut();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Delete account error:', error);
      handleDatabaseError(error, 'delete account');
    } finally {
      isDeletingAccount = false;
      showDeleteModal = false;
      deletePassword = '';
    }
  };

  const cancelDeleteAccount = () => {
    showDeleteModal = false;
    deletePassword = '';
  };

  const handleQuickStatusUpdate = async (evt: Event) => {
    evt.preventDefault();
    if (!session?.user || !supabase) return;

    isUpdatingQuickStatuses = true;
    try {
      const validStatuses = quickStatusInputs
        .map((text, index) => ({ text: text.trim(), order: index }))
        .filter((qs) => qs.text.length > 0);

      for (const qs of validStatuses) {
        const validationError = validateStatus(qs.text);
        if (validationError) {
          toastStore.error(`Status ${qs.order + 1}: ${validationError}`);
          return;
        }
      }

      saveQuickStatuses(quickStatusInputs);

      await loadDashboardData();
      toastStore.success('Quick statuses saved.');
    } catch (error) {
      handleDatabaseError(error, 'update quick statuses');
    } finally {
      isUpdatingQuickStatuses = false;
    }
  };

  const MIN_PASSWORD_LENGTH = 6;

  const handleChangePassword = async (evt: Event) => {
    evt.preventDefault();
    if (!session?.user || !supabase) return;

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toastStore.error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toastStore.error('New passwords do not match.');
      return;
    }

    isChangingPassword = true;
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: session.user.email!,
        password: currentPassword
      });

      if (authError) {
        toastStore.error('Current password is incorrect.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        toastStore.error(updateError.message);
        return;
      }

      toastStore.success('Password updated successfully.');
      currentPassword = '';
      newPassword = '';
      confirmNewPassword = '';
    } catch (error) {
      handleDatabaseError(error, 'change password');
    } finally {
      isChangingPassword = false;
    }
  };

  const handleChangeEmail = async (evt: Event) => {
    evt.preventDefault();
    if (!session?.user || !supabase) return;

    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail) {
      toastStore.error('Please enter a new email address.');
      return;
    }

    if (trimmedEmail === session.user.email) {
      toastStore.error("That's already your current email address.");
      return;
    }

    isChangingEmail = true;
    emailChangeSuccess = null;
    try {
      const { error } = await supabase.auth.updateUser({ email: trimmedEmail });

      if (error) {
        toastStore.error(error.message);
        return;
      }

      emailChangeSuccess =
        'Check your new inbox for a confirmation link. Your email will update once confirmed.';
      newEmail = '';
    } catch (error) {
      handleDatabaseError(error, 'change email');
    } finally {
      isChangingEmail = false;
    }
  };

  const handleUsernameUpdate = async (evt: Event) => {
    evt.preventDefault();
    if (!session?.user || !supabase) return;

    const sanitizedUsername = sanitizeUsername(usernameText);
    const validationError = validateUsername(sanitizedUsername);
    if (validationError) {
      toastStore.error(validationError);
      return;
    }

    isUpdatingUsername = true;
    try {
      const isAvailable = await checkUsernameAvailability(
        supabase,
        sanitizedUsername,
        session.user.id
      );
      if (!isAvailable) {
        toastStore.error(ERROR_MESSAGES.USERNAME_TAKEN);
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ username: sanitizedUsername })
        .eq('id', session.user.id);

      if (error) {
        handleDatabaseError(error, 'update username');
        return;
      }

      await loadDashboardData();
      toastStore.success('Username updated.');
    } catch (error) {
      handleDatabaseError(error, 'update username');
    } finally {
      isUpdatingUsername = false;
    }
  };

  const handleDisplayNameUpdate = async (evt: Event) => {
    evt.preventDefault();
    if (!session?.user || !supabase) return;

    const sanitizedDisplayName = sanitizeDisplayName(displayNameText);
    const validationError = validateDisplayName(sanitizedDisplayName);
    if (validationError) {
      toastStore.error(validationError);
      return;
    }

    isUpdatingDisplayName = true;
    try {
      const { error } = await supabase
        .from('users')
        .update({ display_name: sanitizedDisplayName || null })
        .eq('id', session.user.id);

      if (error) {
        handleDatabaseError(error, 'update display name');
        return;
      }

      await loadDashboardData();
      toastStore.success('Display name updated.');
    } catch (error) {
      handleDatabaseError(error, 'update display name');
    } finally {
      isUpdatingDisplayName = false;
    }
  };

  const exportAppearanceSettings = () => {
    const theme = localStorage.getItem('theme') || 'light';
    const variant = localStorage.getItem('avatar_variant') || 'beam';
    let colors = ['#FFC8DD', '#BDE0FE', '#A2D2FF', '#FFAFCC', '#CDB4DB'];
    const storedColors = localStorage.getItem('avatar_colors');
    if (storedColors) {
      try {
        colors = JSON.parse(storedColors);
      } catch (error) {
        console.error('Invalid avatar_colors JSON in localStorage', error);
      }
    }

    const settings = {
      theme,
      avatar_variant: variant,
      avatar_colors: colors
    };

    navigator.clipboard
      .writeText(JSON.stringify(settings, null, 2))
      .then(() => toastStore.success('Appearance settings copied to clipboard.'))
      .catch((err) => {
        console.error('Failed to copy settings', err);
        toastStore.error('Failed to copy settings to clipboard.');
      });
  };

  const handleImportSettingsClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const settings = JSON.parse(text);

      if (settings.theme) {
        localStorage.setItem('theme', settings.theme);
        const oneYear = 60 * 60 * 24 * 365;
        document.cookie = `theme=${settings.theme}; max-age=${oneYear}; path=/; SameSite=Lax`;
        document.documentElement.setAttribute('data-theme', settings.theme);
        window.dispatchEvent(new Event('theme-change'));
      }

      if (settings.avatar_variant) {
        localStorage.setItem('avatar_variant', settings.avatar_variant);
      }

      if (settings.avatar_colors && Array.isArray(settings.avatar_colors)) {
        localStorage.setItem('avatar_colors', JSON.stringify(settings.avatar_colors));
      }

      toastStore.success('Appearance settings imported. Reloading to apply...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toastStore.error('Invalid settings in clipboard.');
      console.error('Import error:', error);
    }
  };
</script>

<div class="container mx-auto max-w-4xl px-4 py-8 sm:px-6">
  <header class="mb-12">
    <h1 class="text-base-content mb-3 text-4xl font-bold">Settings</h1>
    <p class="text-base-content/70 text-lg">Update your profile, security, and appearance.</p>
  </header>

  <div class="space-y-12">
    <section class="card bg-base-200 shadow-sm" aria-labelledby="profile-heading">
      <div class="card-body p-6 sm:p-8">
        <h2 id="profile-heading" class="card-title mb-6 flex items-center gap-3 text-2xl">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          Profile Information
        </h2>
        <div class="space-y-8">
          {#if dev}
            <div class="space-y-6">
              <h3 class="text-base-content/80 border-base-300 border-b pb-2 text-lg font-semibold">
                Account Information
              </h3>

              <div class="form-control min-w-0">
                <label class="label" for="user-id-input">
                  <span class="label-text font-medium">User ID</span>
                </label>
                <input
                  id="user-id-input"
                  type="text"
                  value={session?.user?.id || ''}
                  class="input input-bordered w-full font-mono text-sm"
                  disabled
                  aria-describedby="user-id-help"
                />
              </div>
            </div>
          {/if}

          <div class="space-y-6">
            <h3 class="text-base-content/80 border-base-300 border-b pb-2 text-lg font-semibold">
              Username
            </h3>

            {#if isLoadingData}
              <div class="form-control min-w-0">
                <div class="skeleton h-12 w-full"></div>
              </div>
            {:else}
              <div class="space-y-4">
                {#if currentUsername}
                  <div class="bg-base-300 rounded-lg p-4">
                    <p class="text-base-content text-lg font-medium">
                      Current username: <span class="text-primary font-mono">{currentUsername}</span
                      >
                    </p>
                  </div>
                {/if}

                <form onsubmit={handleUsernameUpdate} class="space-y-4">
                  <div class="form-control min-w-0">
                    <label class="label" for="username-input">
                      <span class="label-text font-medium"
                        >{currentUsername ? 'Update' : 'Set'} your username</span
                      >
                      {#if usernameCharacterCount > 0}
                        <span
                          class="font-mono text-sm {usernameCharacterCount > MAX_USERNAME_LENGTH
                            ? 'text-error'
                            : 'text-base-content/60'}"
                        >
                          {usernameCharacterCount}/{MAX_USERNAME_LENGTH}
                        </span>
                      {/if}
                    </label>
                    <div class="join w-full min-w-0">
                      <div class="w-full">
                        <div class="input validator join-item w-full">
                          <svg
                            class="h-[1em] opacity-50"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <g
                              stroke-linejoin="round"
                              stroke-linecap="round"
                              stroke-width="2.5"
                              fill="none"
                              stroke="currentColor"
                            >
                              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </g>
                          </svg>
                          <input
                            id="username-input"
                            bind:value={usernameText}
                            type="text"
                            required
                            placeholder="Enter your username"
                            pattern="[A-Za-z][A-Za-z0-9._\-]*"
                            minlength="3"
                            maxlength={MAX_USERNAME_LENGTH}
                            aria-describedby="username-help"
                          />
                        </div>
                      </div>
                      <button
                        class="btn btn-primary join-item"
                        disabled={isUpdatingUsername}
                        type="submit"
                        aria-describedby="username-help"
                      >
                        {#if isUpdatingUsername}
                          <span class="loading loading-spinner loading-xs"></span>
                        {:else}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            ><g
                              fill="none"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              ><path
                                fill="currentColor"
                                fill-opacity="0"
                                stroke-dasharray="20"
                                stroke-dashoffset="20"
                                d="M12 15h2v-6h2.5l-4.5 -4.5M12 15h-2v-6h-2.5l4.5 -4.5"
                                ><animate
                                  fill="freeze"
                                  attributeName="fill-opacity"
                                  begin="0.7s"
                                  dur="0.5s"
                                  values="0;1"
                                /><animate
                                  fill="freeze"
                                  attributeName="stroke-dashoffset"
                                  dur="0.4s"
                                  values="20;0"
                                /></path
                              ><path stroke-dasharray="14" stroke-dashoffset="14" d="M6 19h12"
                                ><animate
                                  fill="freeze"
                                  attributeName="stroke-dashoffset"
                                  begin="0.5s"
                                  dur="0.2s"
                                  values="14;0"
                                /></path
                              ></g
                            ></svg
                          >
                        {/if}
                      </button>
                    </div>
                    <div class="label w-full max-w-full">
                      <span id="username-help" class="settings-field-hint">
                        3–{MAX_USERNAME_LENGTH} characters. Must start with a letter. Letters, numbers,
                        dots, dashes, and underscores only.
                      </span>
                    </div>
                  </div>
                </form>
              </div>
            {/if}
          </div>

          <div class="space-y-6">
            <h3 class="text-base-content/80 border-base-300 border-b pb-2 text-lg font-semibold">
              Display Name
            </h3>

            {#if isLoadingData}
              <div class="form-control min-w-0">
                <div class="skeleton h-12 w-full"></div>
              </div>
            {:else}
              <div class="space-y-4">
                {#if currentDisplayName}
                  <div class="bg-base-300 rounded-lg p-4">
                    <p class="text-base-content text-lg font-medium">
                      Current display name: <span class="text-primary">{currentDisplayName}</span>
                    </p>
                  </div>
                {/if}

                <form onsubmit={handleDisplayNameUpdate} class="space-y-4">
                  <div class="form-control min-w-0">
                    <label class="label" for="display-name-input">
                      <span class="label-text font-medium"
                        >{currentDisplayName ? 'Update' : 'Set'} your display name</span
                      >
                      {#if displayNameCharacterCount > 0}
                        <span
                          class="font-mono text-sm {displayNameCharacterCount >
                          MAX_DISPLAY_NAME_LENGTH
                            ? 'text-error'
                            : 'text-base-content/60'}"
                        >
                          {displayNameCharacterCount}/{MAX_DISPLAY_NAME_LENGTH}
                        </span>
                      {/if}
                    </label>
                    <div class="join w-full min-w-0">
                      <div class="w-full">
                        <div class="input validator join-item w-full">
                          <svg
                            class="h-[1em] opacity-50"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <g
                              stroke-linejoin="round"
                              stroke-linecap="round"
                              stroke-width="2.5"
                              fill="none"
                              stroke="currentColor"
                            >
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </g>
                          </svg>
                          <input
                            id="display-name-input"
                            bind:value={displayNameText}
                            type="text"
                            placeholder="Enter your display name (optional)"
                            maxlength={MAX_DISPLAY_NAME_LENGTH}
                            aria-describedby="display-name-help"
                          />
                        </div>
                      </div>
                      <button
                        class="btn btn-primary join-item"
                        disabled={isUpdatingDisplayName}
                        type="submit"
                        aria-describedby="display-name-help"
                      >
                        {#if isUpdatingDisplayName}
                          <span class="loading loading-spinner loading-xs"></span>
                        {:else}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            ><g
                              fill="none"
                              stroke="currentColor"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              ><path
                                fill="currentColor"
                                fill-opacity="0"
                                stroke-dasharray="20"
                                stroke-dashoffset="20"
                                d="M12 15h2v-6h2.5l-4.5 -4.5M12 15h-2v-6h-2.5l4.5 -4.5"
                                ><animate
                                  fill="freeze"
                                  attributeName="fill-opacity"
                                  begin="0.7s"
                                  dur="0.5s"
                                  values="0;1"
                                /><animate
                                  fill="freeze"
                                  attributeName="stroke-dashoffset"
                                  dur="0.4s"
                                  values="20;0"
                                /></path
                              ><path stroke-dasharray="14" stroke-dashoffset="14" d="M6 19h12"
                                ><animate
                                  fill="freeze"
                                  attributeName="stroke-dashoffset"
                                  begin="0.5s"
                                  dur="0.2s"
                                  values="14;0"
                                /></path
                              ></g
                            ></svg
                          >
                        {/if}
                      </button>
                    </div>
                    <div class="label w-full max-w-full">
                      <span id="display-name-help" class="settings-field-hint">
                        Shown to friends instead of your username. Leave blank to show your
                        username.
                      </span>
                    </div>
                  </div>
                </form>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </section>

    <section class="card bg-base-200 shadow-sm" aria-labelledby="security-heading">
      <div class="card-body p-6 sm:p-8">
        <h2 id="security-heading" class="card-title mb-6 flex items-center gap-3 text-2xl">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Security
        </h2>
        <div class="space-y-8">
          <div class="space-y-6">
            <h3 class="text-base-content/80 border-base-300 border-b pb-2 text-lg font-semibold">
              Email Address
            </h3>

            <div class="bg-base-300 rounded-lg p-4">
              <p class="text-base-content text-lg font-medium">
                Current email: <span class="text-primary">{session?.user?.email || ''}</span>
              </p>
            </div>

            {#if emailChangeSuccess}
              <div class="alert alert-success animate-alert-in" role="alert">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 shrink-0 stroke-current"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{emailChangeSuccess}</span>
                <button
                  class="btn btn-sm btn-ghost"
                  onclick={() => (emailChangeSuccess = null)}
                  type="button">✕</button
                >
              </div>
            {/if}

            <form onsubmit={handleChangeEmail} class="space-y-4">
              <div class="form-control min-w-0">
                <label class="label" for="new-email-input">
                  <span class="label-text font-medium">New email address</span>
                </label>
                <div class="join w-full min-w-0">
                  <input
                    id="new-email-input"
                    type="email"
                    bind:value={newEmail}
                    required
                    placeholder="newemail@example.com"
                    class="input input-bordered join-item w-full"
                    aria-describedby="change-email-help"
                  />
                  <button
                    class="btn btn-primary join-item"
                    disabled={isChangingEmail}
                    type="submit"
                  >
                    {#if isChangingEmail}
                      <span class="loading loading-spinner loading-xs"></span>
                    {:else}
                      Update
                    {/if}
                  </button>
                </div>
                <div class="label w-full max-w-full">
                  <span id="change-email-help" class="settings-field-hint">
                    A confirmation link will be sent to the new address. Your email won't change
                    until you confirm.
                  </span>
                </div>
              </div>
            </form>
          </div>

          <div class="space-y-6">
            <h3 class="text-base-content/80 border-base-300 border-b pb-2 text-lg font-semibold">
              Change Password
            </h3>

            <form onsubmit={handleChangePassword} class="space-y-4">
              <div class="form-control min-w-0">
                <label class="label" for="current-password-input">
                  <span class="label-text font-medium">Current password</span>
                </label>
                <input
                  id="current-password-input"
                  type="password"
                  autocomplete="current-password"
                  bind:value={currentPassword}
                  required
                  placeholder="Enter current password"
                  class="input input-bordered w-full"
                />
              </div>

              <div class="form-control min-w-0">
                <label class="label" for="new-password-input">
                  <span class="label-text font-medium">New password</span>
                </label>
                <input
                  id="new-password-input"
                  type="password"
                  autocomplete="new-password"
                  bind:value={newPassword}
                  required
                  minlength={MIN_PASSWORD_LENGTH}
                  placeholder="Enter new password"
                  class="input input-bordered w-full"
                />
              </div>

              <div class="form-control min-w-0">
                <label class="label" for="confirm-new-password-input">
                  <span class="label-text font-medium">Confirm new password</span>
                </label>
                <input
                  id="confirm-new-password-input"
                  type="password"
                  autocomplete="new-password"
                  bind:value={confirmNewPassword}
                  required
                  minlength={MIN_PASSWORD_LENGTH}
                  placeholder="Confirm new password"
                  class="input input-bordered w-full"
                />
              </div>

              <div class="form-control mt-2">
                <button class="btn btn-primary" disabled={isChangingPassword} type="submit">
                  {#if isChangingPassword}
                    <span class="loading loading-spinner loading-sm"></span>
                    Updating...
                  {:else}
                    Change Password
                  {/if}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>

    <section class="card bg-base-200 shadow-sm" aria-labelledby="quick-status-heading">
      <div class="card-body p-6 sm:p-8">
        <h2 id="quick-status-heading" class="card-title mb-6 flex items-center gap-3 text-2xl">
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
          Quick Statuses
        </h2>
        <div class="space-y-4">
          <p class="text-base-content/70 text-sm">
            Save statuses you use often - they'll appear as shortcuts on your dashboard.
          </p>

          {#if isLoadingData}
            <div class="space-y-3">
              {#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
                <div class="skeleton h-12 w-full"></div>
              {/each}
            </div>
          {:else}
            <form onsubmit={handleQuickStatusUpdate} class="space-y-4">
              {#each Array.from({ length: 5 }, (_, i) => i) as index (index)}
                <div class="form-control min-w-0">
                  <label class="label" for="quick-status-{index}">
                    <span class="label-text font-medium">Status {index + 1}</span>
                    <span
                      class="font-mono text-sm {(quickStatusInputs[index]?.length || 0) >
                      MAX_STATUS_LENGTH
                        ? 'text-error'
                        : 'text-base-content/60'}"
                    >
                      {quickStatusInputs[index]?.length || 0}/{MAX_STATUS_LENGTH}
                    </span>
                  </label>
                  <input
                    id="quick-status-{index}"
                    type="text"
                    bind:value={quickStatusInputs[index]}
                    class="input input-bordered w-full"
                    placeholder="Enter a quick status (optional)"
                    maxlength={MAX_STATUS_LENGTH}
                  />
                </div>
              {/each}

              <div class="form-control mt-6">
                <button
                  class="btn btn-primary"
                  disabled={isUpdatingQuickStatuses}
                  type="submit"
                  aria-describedby="quick-status-help"
                >
                  {#if isUpdatingQuickStatuses}
                    <span class="loading loading-spinner loading-sm"></span>
                    Updating...
                  {:else}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      ><g
                        fill="none"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        ><path
                          fill="currentColor"
                          fill-opacity="0"
                          stroke-dasharray="20"
                          stroke-dashoffset="20"
                          d="M12 15h2v-6h2.5l-4.5 -4.5M12 15h-2v-6h-2.5l4.5 -4.5"
                          ><animate
                            fill="freeze"
                            attributeName="fill-opacity"
                            begin="0.7s"
                            dur="0.5s"
                            values="0;1"
                          /><animate
                            fill="freeze"
                            attributeName="stroke-dashoffset"
                            dur="0.4s"
                            values="20;0"
                          /></path
                        ><path stroke-dasharray="14" stroke-dashoffset="14" d="M6 19h12"
                          ><animate
                            fill="freeze"
                            attributeName="stroke-dashoffset"
                            begin="0.5s"
                            dur="0.2s"
                            values="14;0"
                          /></path
                        ></g
                      ></svg
                    >
                    Save Quick Statuses
                  {/if}
                </button>
                <div class="label w-full max-w-full">
                  <span id="quick-status-help" class="settings-field-hint">
                    Leave a field blank to remove that quick status.
                  </span>
                </div>
              </div>
            </form>
          {/if}
        </div>
      </div>
    </section>

    <section class="card bg-base-200 shadow-sm" aria-labelledby="appearance-heading">
      <div class="card-body p-6 sm:p-8">
        <h2 id="appearance-heading" class="card-title mb-6 flex items-center gap-3 text-2xl">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
            ><path
              fill="currentColor"
              d="M11 13.5v8H3v-8zm-2 2H5v4h4zM12 2l5.5 9h-11zm0 3.86L10.08 9h3.84zM17.5 13c2.5 0 4.5 2 4.5 4.5S20 22 17.5 22S13 20 13 17.5s2-4.5 4.5-4.5m0 2a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5"
            /></svg
          >
          Appearance
        </h2>
        <div class="space-y-8">
          <div class="space-y-6">
            <h3 class="text-base-content/80 border-base-300 border-b pb-2 text-lg font-semibold">
              Theme
            </h3>
            <ThemeSelect />
          </div>

          <AvatarSettings />

          <div class="border-base-300 mt-6 border-t pt-6">
            <h3 class="text-base-content/80 mb-4 text-lg font-semibold">Manage Appearance</h3>
            <div class="flex flex-wrap gap-4">
              <button class="btn btn-outline" onclick={exportAppearanceSettings} type="button">
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
                  ><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path
                    d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                  ></path></svg
                >
                Copy to clipboard
              </button>

              <button class="btn btn-outline" onclick={handleImportSettingsClipboard} type="button">
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
                  ><path
                    d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
                  ></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg
                >
                Paste from clipboard
              </button>
            </div>
            <p class="text-base-content/60 mt-3 text-sm">
              Copy your theme and avatar settings to use on another device.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="card bg-base-200 shadow-sm" aria-labelledby="data-management-heading">
      <div class="card-body p-6 sm:p-8">
        <h2 id="data-management-heading" class="card-title mb-6 flex items-center gap-3 text-2xl">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
            />
          </svg>
          Data Management
        </h2>
        <div class="space-y-6">
          <div class="form-control min-w-0">
            <button
              class="btn btn-outline btn-primary btn-lg"
              onclick={exportData}
              disabled={isLoading}
              aria-describedby="export-help"
            >
              {#if isLoading}
                <span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
                Exporting...
              {:else}
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
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export Data
              {/if}
            </button>
            <div class="label w-full max-w-full">
              <span id="export-help" class="settings-field-hint"
                >Download a copy of your friends, statuses, and account info.</span
              >
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      class="card bg-error/5 border-error border shadow-sm"
      aria-labelledby="danger-zone-heading"
    >
      <div class="card-body p-6 sm:p-8">
        <h2
          id="danger-zone-heading"
          class="card-title text-error mb-6 flex items-center gap-3 text-2xl"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
            ><path
              fill="currentColor"
              d="M2.725 21q-.275 0-.5-.137t-.35-.363t-.137-.488t.137-.512l9.25-16q.15-.25.388-.375T12 3t.488.125t.387.375l9.25 16q.15.25.138.513t-.138.487t-.35.363t-.5.137zM12 18q.425 0 .713-.288T13 17t-.288-.712T12 16t-.712.288T11 17t.288.713T12 18m0-3q.425 0 .713-.288T13 14v-3q0-.425-.288-.712T12 10t-.712.288T11 11v3q0 .425.288.713T12 15"
            /></svg
          >
          Danger Zone
        </h2>
        <div class="space-y-6">
          <div class="form-control min-w-0">
            <button
              class="btn btn-error btn-outline btn-lg"
              onclick={deleteAccount}
              aria-describedby="delete-account-help"
            >
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete Account
            </button>
            <div class="label w-full max-w-full">
              <span id="delete-account-help" class="settings-field-hint-error">
                Deletes your account, all friends, and all statuses. This can't be undone.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</div>

<dialog
  open={showDeleteModal}
  class="modal modal-bottom sm:modal-middle"
  aria-labelledby="delete-modal-title"
  onclick={(e) => e.target === e.currentTarget && cancelDeleteAccount()}
>
  <div class="modal-box animate-modal-in max-w-md">
    <h3 id="delete-modal-title" class="text-error mb-4 flex items-center gap-2 text-xl font-bold">
      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
      Delete Account
    </h3>
    <p class="text-base-content/80 mb-6">
      All your friendships, statuses, and account data will be permanently deleted. This can't be
      undone.
    </p>
    <div class="form-control mb-6">
      <label class="label" for="delete-password">
        <span class="label-text font-medium">Enter your password to confirm</span>
      </label>
      <input
        id="delete-password"
        type="password"
        bind:value={deletePassword}
        class="input input-bordered w-full"
        placeholder="Your password"
        disabled={isDeletingAccount}
        aria-describedby="delete-password-help"
      />
      <div class="label w-full max-w-full">
        <span id="delete-password-help" class="settings-field-hint-error">
          Your account and all its data will be gone permanently.
        </span>
      </div>
    </div>
    <div class="modal-action">
      <button
        class="btn btn-ghost"
        onclick={cancelDeleteAccount}
        disabled={isDeletingAccount}
        type="button"
      >
        Cancel
      </button>
      <button
        class="btn btn-error"
        onclick={confirmDeleteAccount}
        disabled={isDeletingAccount || !deletePassword.trim()}
        type="button"
      >
        {#if isDeletingAccount}
          <span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
          Deleting...
        {:else}
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete Account
        {/if}
      </button>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button onclick={cancelDeleteAccount}>close</button>
  </form>
</dialog>
