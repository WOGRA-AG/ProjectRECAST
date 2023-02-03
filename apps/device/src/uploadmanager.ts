import { FolderWatcher as FolderWatcher } from './folderwatcher'
import 'dotenv/config';
import { RecastClient } from './recastclient';
import { RealtimeChannel, RealtimePostgresInsertPayload, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

export class UploadManager {
  private folderWatcher: FolderWatcher = new FolderWatcher();
  private uploadChannel: RealtimeChannel;
  private supabase: SupabaseClient;

  constructor(client: RecastClient) {
    this.initialize(client);
    this.uploadChannel = this.create_channel(client);
    this.uploadChannel.subscribe();
    this.supabase = client.supabase;
  }

  create_channel(client: RecastClient): RealtimeChannel {
     return client.supabase.channel('upload')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'upload', filter: "active=eq.true" },
        (payload: any) => {
          this.open(payload)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'upload', filter: "active=eq.false"},
        (payload: any) => {
          this.close(payload)
        }
      )
  }

  async initialize(client: RecastClient): Promise<void> {
    const data = await this.check_for_active_upload(client);
    if (data !== null) {
      this.start_watcher(data.prefix);
    }
  }

  async check_for_active_upload(client: RecastClient): Promise<{ bucket: string, prefix: string } | null> {
    let { data, error } = await client.supabase.from('upload').select('bucket, prefix').is('active', true);

    if (data != null && data.length === 0) {
      console.log(`UploadManager: No active upload!`);
      return null;
    } else {
      let bucket: string = data && data[0].bucket;
      console.log(`UploadManager: Bucket "${bucket}".`);
      let prefix: string = data && data[0].prefix;
      console.log(`UploadManager: Prefix "${prefix}".`);
      return { bucket, prefix };
    }
  }

  start_watcher(prefix: string) {
    const path: string = './data/' + prefix;
    this.folderWatcher.start(path);
  }

  stop_watcher(): string | undefined {
    return this.folderWatcher.stop();
  }

  open<T extends { [key: string]: any }>(payload: RealtimePostgresInsertPayload<T>) {
    const prefix: string = payload.new.prefix;
    console.log(`UploadManager: Active upload for prefix "${prefix}"`);
    this.start_watcher(payload.new.prefix);
  }

  close<T extends { [key: string]: any }>(payload: RealtimePostgresInsertPayload<T>) {
    const bucket: string = payload.new.bucket;
    const prefix: string = payload.new.prefix;
    const filePath: string | undefined = this.stop_watcher();

    if (filePath != undefined) {
      const localfilepath: string = './' + filePath;
      const s3filepath: string = prefix + '/' + path.basename(filePath);
      const url: string = bucket + '/' + s3filepath;
      console.log(`UploadManager: Upload file ${filePath} to s3://${url}`);
      const fileBuffer = fs.readFileSync(localfilepath);
      this.supabase
        .storage
        .from(bucket)
        .upload(s3filepath, fileBuffer, {
          cacheControl: '3600',
          upsert: false
        }).then(response => console.log(`UploadManager: ${response}`));
    } else {
      console.log(`UploadManager: Nothing to upload`);
    }
  }
}

