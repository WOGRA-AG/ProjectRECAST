import { RecastClient } from './client'
import { mkdirp } from 'mkdirp'
import { Watcher } from './watcher'
import 'dotenv/config';

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

async function get_upload(client: RecastClient): Promise<{ bucket: string, prefix: string } | null> {
  let { data, error } = await client.supabase.from('upload').select('bucket, prefix').is('status', true);

  if (data === null) {
    console.log(`No active upload!`);
    return null;
  } 
  else {
    let bucket: string = data && data[0].bucket;
    console.log(`Bucket "${bucket}".`);
    let prefix: string = data && data[0].prefix;
    console.log(`Prefix "${prefix}".`);
    return { bucket , prefix };
  }
}

async function create_folder(folderPath: string): Promise<string> {
  let made = mkdirp(folderPath);  
  folderPath = typeof made == 'string' ? made : folderPath;
  return folderPath
}

async function inital_call(client: RecastClient): Promise<void> {
  const data = await get_upload(client);
  if (data !== null) {
    const folderPath = await create_folder('./data/' + data.prefix);
    watcher.start(folderPath);
  }
}

inital_call(client)

const fileUpload = client.supabase.channel('custom-all-channel')
.on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'upload' },
  (payload: any) => {
    console.log('Change received!', payload)
  }
)
.subscribe()

