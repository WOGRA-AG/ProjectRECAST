import { RecastClient } from './client'
import { RealtimeClient } from '@supabase/realtime-js'


const supabaseurl = 'fbrhcyxrfnfojfuioexq.supabase.co'
const supabasekey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZicmhjeXhyZm5mb2pmdWlvZXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Njc5ODkzNzksImV4cCI6MTk4MzU2NTM3OX0.B11sNHYYnEskYELwPz6LkKnl2z2sK3th5E5K9lLHlNU'
const email = 'example_js@email.com'
const password = 'example_js-password'

let client = new RecastClient('https://' + supabaseurl, supabasekey, email, password)

async function get_upload(client: RecastClient): Promise<{ bucket: string, prefix: string }> {
  //SELECT bucket, prefix FROM upload WHERE (status is true AND owner_id = '0b027f1a-f439-4953-9089ud1a2144b7d88' )
  let { data, error } = await client.supabase.from('upload').select('bucket, prefix').is('status', true)
  let bucket: string = data && data[0].bucket;
  let prefix: string = data && data[0].prefix;
  return { bucket , prefix }
}

get_upload(client).then(data => console.log(data.bucket))

const fileUpload = client.supabase.channel('custom-all-channel')
.on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'upload' },
  (payload: any) => {
    console.log('Change received!', payload)
  }
)
.subscribe()

