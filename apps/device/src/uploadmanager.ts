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
  private device_id: string | undefined = undefined;

  constructor(client: RecastClient) {
    this.initialize(client);
    this.uploadChannel = this.create_channel(client);
    this.uploadChannel.subscribe();
    this.supabase = client.supabase;
  }

  private create_channel(client: RecastClient): RealtimeChannel {
     return client.supabase.channel('upload')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'upload', filter: "active=eq.true" },
        (payload: any) => {
          try { 
            this.open(payload);
          } catch (error) {
            console.error(error);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'upload', filter: "active=eq.false"},
        (payload: any) => {
          try { 
            this.close(payload)
          } catch (error) {
            console.error(error);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'devices'},
        (payload: any) => {
          try { 
            this.update_device_id(payload);
          } catch (error) {
            console.error(error);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'devices' },
        (payload: any) => {
          try { 
            this.update_device_id(payload)
          } catch (error) {
            console.error(error);
          }
        }
      )
  }

  private async initialize(client: RecastClient): Promise<void> {
    this.clear();

    try {
      this.device_id = await this.get_device_id(client);
    } catch(error) {
      console.error(`UploadManager: no device_id.`);
    }

    if (this.device_id !== undefined) {
      console.info(`UploadManager: using device_id "${this.device_id}".`);
      try {
        this.check_on_startup_for_active_upload(client);
      } catch(error) {
        console.error(error);
      }
    } else {
      console.log(`UploadManager: waiting for device_id.`);
    }
  }

  private async get_device_id(client: RecastClient): Promise<string> {
    const { data, error } = await client.supabase.from('devices').select('device_id');
    if (!error && data?.length > 0) {
      const device_id: string = data[0].device_id;
      return device_id;
    } 
    else {
      throw new Error(`UploadManager: no device_id found in database.`);
    }
  }

  private async check_on_startup_for_active_upload(client: RecastClient): Promise<void> {
    const { data, error } = await client.supabase.from('upload').select('*').is('device_id', this.device_id).is('active', true);
    if (!error && data?.length > 0) {
      const prefix: string = data[0].prefix;
      console.info(`UploadManager: active upload found on startup for prefix "${prefix}".`);
      this.start_watcher(data[0].local_folder_name);
    } 
    else {
      console.info(`UploadManager: no active upload found on startup. Waiting for Upload`);
    }
  }

  private start_watcher(folderPath: string) {
    const relativeFolderPath: string = this.dataFolder + folderPath;
    try {
      this.folderWatcher.start(relativeFolderPath);
    } catch(error) {
      console.error(`UploadManager: upload failed`, error);
    }
  }

  private stop_watcher(): string | undefined {
    let currentPaths: string[] = [];
    try {
      currentPaths = this.folderWatcher.stop();
    } catch(error) {
      console.error(`UploadManager: folderWatcher does not respond`, error);
    }
    return this.get_latest_filePath(currentPaths);
  }

  private get_latest_filePath(currentPaths: string[]): string | undefined {
    const latestFilePath = currentPaths.pop();

    if (typeof latestFilePath == 'undefined') {
      return undefined;
    } else {
      return './' + latestFilePath;
    }
  }

  private update_device_id<T extends { [key: string]: any }>(payload: RealtimePostgresInsertPayload<T>): void {
    this.device_id = payload.new.device_id;
    console.info(`UploadManager: found new device_id "${this.device_id}"`);
  }
  
  private open<T extends { [key: string]: any }>(payload: RealtimePostgresInsertPayload<T>): void {
    const prefix: string = payload.new.prefix;
    console.info(`UploadManager: active upload found for prefix "${prefix}"`);
    this.start_watcher(payload.new.local_folder_name);
  }

  private async close<T extends { [key: string]: any }>(payload: RealtimePostgresInsertPayload<T>): Promise<void> {
    const filePath: string | undefined = this.stop_watcher();

    if (filePath != undefined) {
      console.info(`UploadManager: upload ${filePath}.`);
      try {
        this.upload(payload.new.bucket, payload.new.prefix, filePath);
      } catch(error) {
        console.error(`UploadManager: upload failed`, error);
      }
    }
    else {
      console.info(`UploadManager: nothing to upload.`);
    }

    console.info(`UploadManager: waiting for upload.`);
  }

  private async upload(bucket: string, prefix: string, filePath: string): Promise<void> {
    const localfilepath: string = filePath;
    const s3filepath: string = prefix + '/' + pathBasename(filePath);
    const url: string = bucket + '/' + s3filepath;

    console.debug(`UploadManager: upload ${filePath} to s3://${url}`);
    const fileBuffer = fsReadFileSync(localfilepath);
    const { data, error } = await this.supabase
      .storage
      .from(bucket)
      .upload(s3filepath, fileBuffer, {
        cacheControl: '3600',
        upsert: false
      });
    if (!error)  {
      console.debug(data);
    } 
    else {
      console.error(error);
    }
    this.clear();
  }

  private clear(): void {
    const dataPath = pathResolve(process.cwd(), this.dataFolder);
    console.debug(`UploadManager: clear ${dataPath}`);
    rimrafSync(dataPath);
  }
}

