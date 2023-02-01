import { mkdirp } from 'mkdirp'
import { Watcher } from './watcher'
import 'dotenv/config';
import { RecastClient } from './client';

export class UploadManager {
  private client: RecastClient;
  private watcher: Watcher;

  constructor(client: RecastClient, watcher: Watcher) {
    this.client = client;
    this.watcher = watcher;
    this.inital_call();
  }

  async get_upload(): Promise<{ bucket: string, prefix: string } | null> {
    let { data, error } = await this.client.supabase.from('upload').select('bucket, prefix').is('status', true);

    if (data === null) {
      console.log(`No active upload!`);
      return null;
    } else {
      let bucket: string = data && data[0].bucket;
      console.log(`Bucket "${bucket}".`);
      let prefix: string = data && data[0].prefix;
      console.log(`Prefix "${prefix}".`);
      return { bucket, prefix };
    }
  }

  async create_folder(folderPath: string): Promise<string> {
    let made = mkdirp(folderPath);
    folderPath = typeof made == 'string' ? made : folderPath;
    return folderPath;
  }

  async inital_call(): Promise<void> {
    const data = await this.get_upload();
    if (data !== null) {
      const folderPath = await this.create_folder('./data/' + data.prefix);
      this.watcher.start(folderPath);
    }
  }
}

