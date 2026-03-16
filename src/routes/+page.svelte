<script>
  import { resolve } from '$app/paths';

  const sequences = [
    ['at the coffee shop ☕', 'grabbing lunch 🍜', 'heading home', 'on the couch 🛋️'],
    ['just finished a run 🏃', 'post-run smoothie 🥤', 'gym time 💪', 'stretching 🙆'],
    ['working from home today', 'on a call 📞', 'taking a break ☕', 'wrapping up ✅']
  ];

  let pills = $state([
    {
      id: 0,
      key: 0,
      initials: 'A',
      bg: 'bg-warning/20',
      color: 'text-warning',
      text: sequences[0][0]
    },
    {
      id: 1,
      key: 0,
      initials: 'M',
      bg: 'bg-success/20',
      color: 'text-success',
      text: sequences[1][0]
    },
    { id: 2, key: 0, initials: 'J', bg: 'bg-info/20', color: 'text-info', text: sequences[2][0] }
  ]);

  const counters = [0, 0, 0];
  let turn = 0;

  $effect(() => {
    const interval = setInterval(() => {
      const i = turn % 3;
      turn++;
      counters[i] = (counters[i] + 1) % sequences[i].length;
      pills[i] = { ...pills[i], key: pills[i].key + 1, text: sequences[i][counters[i]] };
    }, 2200);
    return () => clearInterval(interval);
  });
</script>

<div class="relative flex grow flex-col overflow-hidden">
  <!-- Warm background bloom positioned behind the right column -->
  <div class="pointer-events-none absolute inset-0" aria-hidden="true">
    <div
      class="bg-primary/[0.07] absolute -top-32 right-0 h-[700px] w-[700px] translate-x-1/4 rounded-full blur-[120px]"
    ></div>
  </div>

  <!-- Content: vertically centered, two-column on desktop -->
  <div class="relative z-10 flex grow items-center px-6 py-16 sm:px-12 lg:px-16">
    <div class="mx-auto w-full max-w-5xl">
      <div class="grid items-center gap-12 lg:grid-cols-[1fr_360px] lg:gap-20">
        <!-- Left: Hero text + CTA -->
        <div>
          <p
            class="animate-fade-in-up animate-delay-0 text-primary mb-6 text-xs font-bold tracking-[0.2em] uppercase"
          >
            Rezonate
          </p>

          <h1
            class="animate-fade-in-up animate-delay-1 text-base-content mb-5 text-5xl leading-[1.07] font-normal tracking-tight sm:text-6xl lg:text-7xl"
          >
            Know what your<br />
            <span class="text-primary font-bold">close friends</span><br />
            are up to.
          </h1>

          <p class="animate-fade-in-up animate-delay-2 text-base-content/50 mb-10 text-lg">
            Real-time status for the people who matter.
          </p>

          <div class="animate-fade-in-up animate-delay-3">
            <a href={resolve('/dashboard')} class="btn btn-primary btn-lg sm:px-10">
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

        <!-- Right: Live status preview -->
        <div class="animate-fade-in-up animate-delay-4">
          <!-- "Live now" header -->
          <div class="mb-4 flex items-center gap-2">
            <div class="bg-success animate-live-pulse h-1.5 w-1.5 rounded-full"></div>
            <span class="text-base-content/35 text-xs font-semibold tracking-widest uppercase"
              >Live now</span
            >
          </div>

          <div class="space-y-2.5">
            {#each pills as pill (pill.id)}
              <div class="bg-base-200 flex items-center gap-3.5 rounded-2xl px-4 py-3.5">
                <div class="avatar avatar-placeholder flex-shrink-0">
                  <div class="{pill.bg} {pill.color} w-9 rounded-full text-xs font-bold">
                    <span>{pill.initials}</span>
                  </div>
                </div>
                {#key pill.key}
                  <span class="animate-status-reveal text-base-content/70 min-w-0 flex-1 text-sm"
                    >{pill.text}</span
                  >
                {/key}
                <div class="bg-success ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full"></div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
