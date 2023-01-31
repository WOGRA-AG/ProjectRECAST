import { RecastClient } from './client'
import { RealtimeClient } from '@supabase/realtime-js'


const supabaseurl = 'fbrhcyxrfnfojfuioexq.supabase.co'
const supabasekey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZicmhjeXhyZm5mb2pmdWlvZXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Njc5ODkzNzksImV4cCI6MTk4MzU2NTM3OX0.B11sNHYYnEskYELwPz6LkKnl2z2sK3th5E5K9lLHlNU'
const email = 'example_js@email.com'
const password = 'example_js-password'

let client = new RecastClient('https://' + supabaseurl, supabasekey, email, password)

async function read_table(client: RecastClient): Promise<void> {
  await client.supabase.from('file_upload').select('*').then(data => console.log(data))
}

read_table(client)

const rt = new RealtimeClient('ws://' + supabaseurl, {
  params: {
    apikey: supabasekey,
    eventsPerSecond: 10,
  },
})

const fileUpload = client.supabase.channel('custom-all-channel')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'file_upload' },
    (payload: any) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()

