import {
  type SupabaseClientOptions,
  type SupabaseClient,
  createClient
} from '@supabase/supabase-js'

export class RecastClient {
  supabase: SupabaseClient
  private readonly _email: string
  private readonly _password: string
  private readonly _signup: boolean

  constructor (
    supabaseurl: string,
    supabasekey: string,
    email: string,
    password: string,
    signup?: boolean
  ) {
    this._email = email
    this._password = password
    this._signup = signup ?? false
    const options: SupabaseClientOptions<any> = {
      auth: { persistSession: false }
    }
    this.supabase = createClient(supabaseurl, supabasekey, options)
  }

  async login (): Promise<void> {
    if (this._signup) {
      console.debug(
        this.supabase.auth.signUp({
          email: this._email,
          password: this._password
        })
      )
    }
    console.debug(
      await this.supabase.auth.signInWithPassword({
        email: this._email,
        password: this._password
      })
    )
    console.debug(await this.supabase.auth.getSession())
  }
}
