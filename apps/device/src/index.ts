import { RecastClient } from './recastclient'
import { Watcher } from './watcher';
import { UploadManager } from './uploadmanager'

declare const process: {
  env: {
    SUPABASE_URL: string;
    SUPABASE_KEY: string;
    EMAIL: string;
    PASSWORD: string;
  };
};

const supabaseurl = process.env.SUPABASE_URL;
const supabasekey = process.env.SUPABASE_KEY;
const email = process.env.EMAIL;
const password = process.env.PASSWORD;

let client: RecastClient = new RecastClient('https://' + supabaseurl, supabasekey, email, password)
let watcher: Watcher = new Watcher();

const uploadManager = new UploadManager(client, watcher);

const fileUpload = client.supabase.channel('custom-all-channel')
.on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'upload' },
  (payload: any) => {
    console.log('Change received!', payload)
  }
)
.subscribe()

