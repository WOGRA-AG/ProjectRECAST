import { RecastClient } from './recastclient'
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

async function main() {
  let client: RecastClient = new RecastClient('https://' + supabaseurl, supabasekey, email, password)
  const uploadManager = new UploadManager(client);
}
main();
