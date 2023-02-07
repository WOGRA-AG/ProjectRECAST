import { FolderWatcher } from './folderwatcher'
import 'dotenv/config';
import { RecastClient } from './recastclient';
import { RealtimeChannel, RealtimePostgresInsertPayload, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync as fsReadFileSync } from 'fs';
import { basename as pathBasename } from 'path';
import { resolve as pathResolve } from 'path';
import { sync as rimrafSync } from 'rimraf';

export class UploadManager {
  private dataFolder: string = './data/';
  private folderWatcher: FolderWatcher = new FolderWatcher();
  private uploadChannel: RealtimeChannel;
  private supabase: SupabaseClient;
  private device_id: string;

  constructor(client: RecastClient) {
    this.initialize(client);
    this.uploadChannel = this.create_channel(client);
    this.uploadChannel.subscribe();
    this.supabase = client.supabase;
    this.device_id = 'blub'
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
    await client.login();
    this.clear();
    await client.supabase.from('devices').select('device_id').then(data => console.log(data));
    await this.check_for_active_upload(client).then(data => data && this.start_watcher(data));
  }

  async check_for_active_upload(client: RecastClient): Promise<string | null> {
    const { data, error } = await client.supabase.from('upload').select('local_folder_name').is('active', true);

    if (data != null && data.length === 0) {
      console.log(`UploadManager: No active upload!`);
      return null;
    } else {
      let local_folder_name: string = data && data[0].local_folder_name;
      console.log(`UploadManager: Watch "${local_folder_name}".`);
      return local_folder_name;
    }
  }

  start_watcher(folderPath: string) {
    const relativeFolderPath: string = this.dataFolder + folderPath;
    this.folderWatcher.start(relativeFolderPath);
  }

  stop_watcher(): string | undefined {
    return this.folderWatcher.stop();
  }

  open<T extends { [key: string]: any }>(payload: RealtimePostgresInsertPayload<T>): void {
    const prefix: string = payload.new.prefix;
    console.log(`UploadManager: Active upload for prefix "${prefix}"`);
    this.start_watcher(payload.new.prefix);
  }

  async close<T extends { [key: string]: any }>(payload: RealtimePostgresInsertPayload<T>): Promise<void> {
    const filePath: string | undefined = this.stop_watcher();

    if (filePath != undefined) {
      this.upload(payload.new.bucket, payload.new.prefix, filePath)
    } else {
      console.log(`UploadManager: Nothing to upload`);
    }
  }

  async upload(bucket: string, prefix: string, filePath: string): Promise<void> {
      const localfilepath: string = filePath;
      const s3filepath: string = prefix + '/' + pathBasename(filePath);
      const url: string = bucket + '/' + s3filepath;
      console.log(`UploadManager: Upload file ${filePath} to s3://${url}`);
      const fileBuffer = fsReadFileSync(localfilepath);
      const { data, error } = await this.supabase
        .storage
        .from(bucket)
        .upload(s3filepath, fileBuffer, {
          cacheControl: '3600',
          upsert: false
        });
    console.log(`UploadManager: ${data?.path}`);
    this.clear();
  }

  clear(): void {
    const dataPath = pathResolve(process.cwd(), this.dataFolder);
    console.log(`UploadManager: Clear ${dataPath}`);
    rimrafSync(dataPath);
  }
}

