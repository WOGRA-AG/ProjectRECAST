import {
  type SupabaseClientOptions,
  type SupabaseClient,
  createClient
} from '@supabase/supabase-js'

export class RecastClient {
  supabaseurl: string
  supabasekey: string
  email: string
  password: string
  signup: boolean
  supabase: SupabaseClient

  constructor (
    supabaseurl: string,
    supabasekey: string,
    email: string,
    password: string,
    signup?: boolean
  ) {
    this.supabaseurl = supabaseurl
    this.supabasekey = supabasekey
    this.email = email
    this.password = password
    this.signup = signup || false
    const options: SupabaseClientOptions<any> = {
      auth: { persistSession: false }
    }
    this.supabase = createClient(supabaseurl, supabasekey, options)
  }

  async login (): Promise<void> {
    if (this.signup) {
      console.debug(
        this.supabase.auth.signUp({
          email: this.email,
          password: this.password
        })
      )
    }
    console.debug(
      await this.supabase.auth.signInWithPassword({
        email: this.email,
        password: this.password
      })
    )
    console.debug(await this.supabase.auth.getSession())
  }
}
