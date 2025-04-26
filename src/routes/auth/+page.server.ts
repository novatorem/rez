import { redirect } from '@sveltejs/kit'

import type { Actions } from './$types'

export const actions: Actions = {
  signup: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        console.error(error)
        redirect(303, '/auth/error')
      } else {
        redirect(303, '/')
      }
    } catch (err) {
      console.error('Signup error:', err)
      redirect(303, '/auth/error')
    }
  },
  login: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        console.error(error)
        redirect(303, '/auth/error')
      } else {
        redirect(303, '/dashboard')
      }
    } catch (err) {
      console.error('Login error:', err)
      redirect(303, '/auth/error')
    }
  },
}
