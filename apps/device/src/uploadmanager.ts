import { mkdirp } from 'mkdirp'
import { Watcher } from './watcher'
import 'dotenv/config';
import { RecastClient } from './recastclient';
import { RealtimeChannel, RealtimePostgresInsertPayload } from '@supabase/supabase-js';

export class UploadManager {
  private watcher: Watcher = new Watcher();
  private uploadChannel: RealtimeChannel;

  constructor(client: RecastClient) {
    this.initialize(client);
    this.uploadChannel = this.create_channel(client);
  }

  create_channel(client: RecastClient): RealtimeChannel {
     return client.supabase.channel('upload')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'upload', filter: "status=eq.true" },
        (payload: any) => {
          this.open(payload)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'upload', filter: "status=eq.false"},
        (payload: any) => {
          this.close(payload)
        }
      )
      .subscribe()
  }

  async initialize(client: RecastClient): Promise<void> {
    const data = await this.check_for_active_upload(client);
    if (data !== null) {
      this.start_watcher(data.prefix);
    }
  }

  async check_for_active_upload(client: RecastClient): Promise<{ bucket: string, prefix: string } | null> {
    let { data, error } = await client.supabase.from('upload').select('bucket, prefix').is('status', true);

    if (data != null && data.length === 0) {
      console.log(`No active upload!`);
      return null;
    } else {
      let bucket: string = data && data[0].bucket;
      console.log(`UploadManager: Bucket "${bucket}".`);
      let prefix: string = data && data[0].prefix;
      console.log(`UploadManager: Prefix "${prefix}".`);
      return { bucket, prefix };
    }
  }

  async create_folder(folderPath: string): Promise<string> {
    let made = mkdirp(folderPath);
    folderPath = typeof made == 'string' ? made : folderPath;
    return folderPath;
  }

  async start_watcher(prefix: string) {
      const folderPath = await this.create_folder('./data/' + prefix);
      this.watcher.start(folderPath);
  }

  async stop_watcher() {
    // TODO return latest path
  }

  open<T extends { [key: string]: any }>(payload: RealtimePostgresInsertPayload<T>) {
    console.log('open');
    console.log(payload)
  }

  close<T extends { [key: string]: any }>(payload: RealtimePostgresInsertPayload<T>) {
    console.log('close');
    console.log(payload);
  }

}

