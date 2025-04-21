<script lang="ts">
	let { data } = $props();
	let { colors } = $derived(data);
</script>

<div class="hero min-h-[70vh] bg-gradient-to-br from-primary to-secondary text-primary-content">
  <div class="hero-overlay bg-opacity-60"></div>
  <div class="hero-content text-center">
    <div class="max-w-md">
      <h1 class="mb-5 text-5xl font-bold">Welcome to MyApp</h1>
      <p class="mb-5">The revolutionary new platform that will change the way you work, collaborate, and innovate. Experience seamless integration and unparalleled efficiency.</p>
      <a href="/dashboard" class="btn btn-accent btn-lg">Get Started Today</a>
    </div>
  </div>
</div>

<section class="py-16 px-4 bg-base-100">
  <div class="container mx-auto">
    <h2 class="text-3xl font-bold text-center mb-12">Why Choose MyApp?</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow duration-300">
        <figure class="px-10 pt-10">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 text-primary">
             <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
           </svg>
        </figure>
				<ul>
					{#each colors as color}
						<li>{color.name}</li>
					{/each}
				</ul>
        <div class="card-body items-center text-center">
          <h3 class="card-title">Blazing Fast</h3>
          <p>Our platform is optimized for speed, ensuring you get things done quickly.</p>
          <div class="card-actions">
            <button class="btn btn-ghost btn-sm">Learn More</button>
          </div>
        </div>
      </div>
      <div class="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow duration-300">
         <figure class="px-10 pt-10">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 text-primary">
             <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
           </svg>
        </figure>
        <div class="card-body items-center text-center">
          <h3 class="card-title">Secure</h3>
          <p>Your data is protected with state-of-the-art security measures.</p>
           <div class="card-actions">
            <button class="btn btn-ghost btn-sm">Learn More</button>
          </div>
        </div>
      </div>
      <div class="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow duration-300">
         <figure class="px-10 pt-10">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 text-primary">
             <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.004.827c-.29.24-.438.613-.438 1.001s.148.76.437 1.001l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.333.184-.582.496-.645.87l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.29-.24.438-.613.438-1.001s-.148-.76-.437-1.001l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.184.582-.496.645-.87l.213-1.28z" />
             <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
           </svg>
        </figure>
        <div class="card-body items-center text-center">
          <h3 class="card-title">Easy Collaboration</h3>
          <p>Work seamlessly with your team, no matter where they are.</p>
           <div class="card-actions">
            <button class="btn btn-ghost btn-sm">Learn More</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="py-16 px-4 bg-neutral text-neutral-content">
  <div class="container mx-auto text-center">
    <h2 class="text-3xl font-bold mb-4">Ready to Elevate Your Workflow?</h2>
    <p class="mb-8 max-w-2xl mx-auto">Join thousands of satisfied users who are transforming their productivity with MyApp. Sign up for a free trial today!</p>
    <button class="btn btn-accent btn-lg">Start Free Trial</button>
  </div>
</section>
