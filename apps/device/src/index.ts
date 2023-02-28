import { RecastClient } from './recastclient';
import { UploadManager } from './uploadmanager';

declare const process: {
  env: {
    SUPABASE_URL: string;
    SUPABASE_KEY: string;
    EMAIL: string;
    PASSWORD: string;
  };
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const email = process.env.EMAIL;
const password = process.env.PASSWORD;

async function main(): Promise<void> {
  const client: RecastClient = new RecastClient(
    'https://' + supabaseUrl,
    supabaseKey,
    email,
    password
  );
  await client.login();
  new UploadManager(client);
}

void main();
