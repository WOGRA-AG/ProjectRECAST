import { SupabaseClient, createClient } from '@supabase/supabase-js'

export class RecastClient{
  supabaseurl: string;
  supabasekey: string;
  email: string;
  password: string;
  signup: boolean;
  supabase: SupabaseClient;

  constructor(
    supabaseurl: string,
    supabasekey: string,
    email: string, 
    password: string, 
    signup?: boolean,
  ) {
    this.supabaseurl = supabaseurl,
    this.supabasekey = supabasekey,
    this.email = email;
    this.password = password;
    this.signup = signup || false;
    this.supabase = createClient(supabaseurl, supabasekey);
  }
  init() {

    if (this.signup) {
      this.supabase.auth.signUp({ email: this.email, password: this.password})
    }
    
    this.supabase.auth.signInWithPassword({email: this.email, password: this.password,})
  }
}
