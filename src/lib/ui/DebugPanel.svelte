<script lang="ts">
  import { onMount } from 'svelte';

  interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: unknown;
  }

  let { hasError = $bindable(false), openOnMount = false } = $props();

  let isOpen = $state(false);
  let logs = $state<LogEntry[]>([]);
  let isIOS = $state(false);
  let showPanel = $state(false);

  function openPanel() {
    showPanel = true;
    isOpen = true;
  }

  export { openPanel };

  onMount(() => {
    isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const debugMode = localStorage.getItem('debug-mode') === 'true';
      showPanel = debugMode || isIOS || hasError;

      if (showPanel) {
        addLog('info', 'Debug panel initialized', {
          userAgent: navigator.userAgent,
          isIOS,
          hasError,
          url: window.location.href,
          timestamp: new Date().toISOString()
        });
      }

      if (openOnMount) {
        isOpen = true;
      }
    } else if (hasError) {
      showPanel = true;
      if (openOnMount) {
        isOpen = true;
      }
    }

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog.apply(console, args);
      addLog('info', args.join(' '), args.length > 1 ? args.slice(1) : undefined);
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      addLog('warn', args.join(' '), args.length > 1 ? args.slice(1) : undefined);
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      addLog('error', args.join(' '), args.length > 1 ? args.slice(1) : undefined);
    };

    window.addEventListener('error', (event) => {
      addLog('error', `Unhandled error: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      addLog('error', `Unhandled promise rejection: ${event.reason}`, {
        reason: event.reason
      });
    });

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  });

  function addLog(level: LogEntry['level'], message: string, data?: unknown) {
    logs = [
      ...logs,
      {
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        data
      }
    ];
    if (logs.length > 100) {
      logs = logs.slice(-100);
    }
  }

  function clearLogs() {
    logs = [];
  }

  function exportLogs() {
    const logText = logs
      .map(
        (log) =>
          `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}${
            log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''
          }`
      )
      .join('\n\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function toggleDebugMode() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const current = localStorage.getItem('debug-mode') === 'true';
      localStorage.setItem('debug-mode', (!current).toString());
      location.reload();
    }
  }

  function getDebugMode(): boolean {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem('debug-mode') === 'true';
    }
    return false;
  }

  function addDebugLog(level: LogEntry['level'], message: string, data?: unknown) {
    addLog(level, message, data);
  }

  export { addDebugLog };
</script>

{#if showPanel}
  <button
    class="btn btn-circle btn-sm btn-warning fixed right-4 bottom-4 z-50 shadow-lg"
    onclick={() => (isOpen = !isOpen)}
    aria-label="Toggle debug panel"
    title={hasError ? 'Debug Panel - Error Detected' : 'Debug Panel'}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  </button>

  {#if isOpen}
    <div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <div class="card bg-base-100 max-h-[90vh] w-full max-w-2xl shadow-2xl">
        <div class="card-body">
          <div class="card-title mb-4 justify-between">
            <h2 class="text-xl">Debug Panel</h2>
            <button class="btn btn-sm btn-circle btn-ghost" onclick={() => (isOpen = false)}>
              ✕
            </button>
          </div>

          <div class="bg-base-200 mb-4 rounded-lg p-3">
            <h3 class="mb-2 font-semibold">Device Information</h3>
            <div class="space-y-1 text-sm">
              <p><strong>Platform:</strong> {isIOS ? 'iOS' : 'Other'}</p>
              <p><strong>User Agent:</strong> {navigator.userAgent}</p>
              <p><strong>URL:</strong> {window.location.href}</p>
              <p><strong>Cookies Enabled:</strong> {navigator.cookieEnabled ? 'Yes' : 'No'}</p>
              <p>
                <strong>Local Storage:</strong>
                {typeof Storage !== 'undefined' ? 'Available' : 'Not Available'}
              </p>
            </div>
          </div>

          <div class="mb-4">
            <div class="mb-2 flex items-center justify-between">
              <h3 class="font-semibold">Logs ({logs.length})</h3>
              <div class="flex gap-2">
                <button class="btn btn-sm btn-ghost" onclick={clearLogs}>Clear</button>
                <button class="btn btn-sm btn-ghost" onclick={exportLogs}>Export</button>
              </div>
            </div>
            <div class="bg-base-200 max-h-96 overflow-y-auto rounded-lg p-3 font-mono text-sm">
              {#if logs.length === 0}
                <p class="text-base-content/60">No logs yet...</p>
              {:else}
                {#each logs as log, index (index)}
                  <div class="border-base-300 mb-2 border-b pb-2 last:border-0">
                    <div class="flex items-start gap-2">
                      <span
                        class="badge badge-sm {log.level === 'error'
                          ? 'badge-error'
                          : log.level === 'warn'
                            ? 'badge-warning'
                            : 'badge-info'}"
                      >
                        {log.level}
                      </span>
                      <span class="text-base-content/60">{log.timestamp}</span>
                    </div>
                    <p class="mt-1 break-words">{log.message}</p>
                    {#if log.data}
                      <details class="mt-1">
                        <summary class="text-primary cursor-pointer">View details</summary>
                        <pre
                          class="bg-base-300 mt-1 overflow-x-auto rounded p-2 text-xs">{JSON.stringify(
                            log.data,
                            null,
                            2
                          )}</pre>
                      </details>
                    {/if}
                  </div>
                {/each}
              {/if}
            </div>
          </div>

          <div class="card-actions justify-end">
            <button class="btn btn-sm btn-ghost" onclick={toggleDebugMode}>
              {getDebugMode() ? 'Disable' : 'Enable'} Debug Mode
            </button>
            <button class="btn btn-sm btn-primary" onclick={() => (isOpen = false)}>Close</button>
          </div>

          <div class="bg-base-200 mt-4 rounded-lg p-3 text-xs">
            <p class="mb-1 font-semibold">About Debug Mode:</p>
            <p class="text-base-content/70">
              When enabled, the debug panel will always be visible (even when there are no errors).
              This is useful for developers or when troubleshooting issues. The setting is saved in
              your browser's local storage.
            </p>
          </div>
        </div>
      </div>
    </div>
  {/if}
{/if}
