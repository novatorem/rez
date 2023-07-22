<script lang="ts">
	
	import { Auth } from '@supabase/auth-ui-svelte'
	import { ThemeSupa } from '@supabase/auth-ui-shared'

	export let data
</script> 
<div class="h-full w-full bg-surface-50-900-token">

	<div class="container h-full mx-auto flex justify-center items-center">

		<div class="space-y-5">
			<div class="row flex-center flex">
				<div class="col-6 form-widget">
					<Auth
						supabaseClient={data.supabase}
						view="magic_link"
						redirectTo={`${data.url}/auth/callback`}
						showLinks={false}
						appearance={{ theme: ThemeSupa, style: { input: 'color: #fff' } }}
					/>
				</div>
			</div>
		</div>
	</div>
	
</div>