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

const fileUpload = client.supabase.channel('upload')
.on(
  'postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'upload', filter: "status=eq.true" },
  (payload: any) => {
    console.log('Upload activated', payload)
  }
)
.on(
  'postgres_changes',
  { event: 'UPDATE', schema: 'public', table: 'upload', filter: "status=eq.true"},
  (payload: any) => {
    console.log('Upload reactivated', payload)
  }
)
.on(
  'postgres_changes',
  { event: 'UPDATE', schema: 'public', table: 'upload', filter: "status=eq.false"},
  (payload: any) => {
    console.log('Upload deactivated', payload)
  }
)
.subscribe()

