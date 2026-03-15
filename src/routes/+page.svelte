<script>
  import { resolve } from '$app/paths';
</script>

<div class="relative flex grow flex-col items-center justify-center overflow-hidden px-6 py-16">
  <!-- Single static warmth bloom - barely there, just takes the edge off the flat background -->
  <div
    class="bg-primary/5 pointer-events-none absolute -top-32 -right-32 h-[560px] w-[560px] rounded-full blur-3xl"
    aria-hidden="true"
  ></div>

  <div class="relative z-10 w-full max-w-md">
    <!-- Eyebrow -->
    <p
      class="animate-fade-in-up animate-delay-0 text-primary mb-5 text-xs font-bold tracking-[0.2em] uppercase"
    >
      Rezonate
    </p>

    <!-- Hero heading -->
    <h1
      class="animate-fade-in-up animate-delay-1 text-base-content mb-3 text-4xl leading-tight font-bold tracking-tight sm:text-5xl"
    >
      Know what your<br />close friends<br />
      are up to.
    </h1>

    <p
      class="animate-fade-in-up animate-delay-2 text-base-content/50 mb-9 text-base"
    >
      Real-time status for the people who matter.
    </p>

    <!-- Example statuses - the product, shown not described -->
    <div class="animate-fade-in-up animate-delay-3 mb-9 space-y-2">
      <div class="bg-base-200 flex items-center gap-3 rounded-2xl px-4 py-3">
        <div class="avatar avatar-placeholder flex-shrink-0">
          <div class="bg-warning/20 text-warning w-8 rounded-full text-xs font-bold">
            <span>A</span>
          </div>
        </div>
        <span class="text-base-content/70 min-w-0 text-sm">at the coffee shop ☕</span>
        <div class="bg-success ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full"></div>
      </div>

      <div class="bg-base-200 flex items-center gap-3 rounded-2xl px-4 py-3">
        <div class="avatar avatar-placeholder flex-shrink-0">
          <div class="bg-success/20 text-success w-8 rounded-full text-xs font-bold">
            <span>M</span>
          </div>
        </div>
        <span class="text-base-content/70 min-w-0 text-sm">just finished a run 🏃</span>
        <div class="bg-success ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full"></div>
      </div>

      <div class="bg-base-200 flex items-center gap-3 rounded-2xl px-4 py-3">
        <div class="avatar avatar-placeholder flex-shrink-0">
          <div class="bg-info/20 text-info w-8 rounded-full text-xs font-bold">
            <span>J</span>
          </div>
        </div>
        <span class="text-base-content/70 min-w-0 text-sm">working from home today</span>
        <div class="bg-success ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full"></div>
      </div>
    </div>

    <!-- CTA -->
    <div class="animate-fade-in-up animate-delay-4">
      <a href={resolve('/dashboard')} class="btn btn-primary btn-lg w-full sm:w-auto sm:px-10">
        Open Rez
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </a>
    </div>
  </div>
</div>
