import { FolderWatcher } from './folderwatcher'
import 'dotenv/config'
import { type RecastClient } from './recastclient'
import {
  type RealtimeChannel,
  type SupabaseClient
} from '@supabase/supabase-js'
import { readFileSync as fsReadFileSync } from 'fs'
import { basename as pathBasename, resolve as pathResolve } from 'path'
import { sync as rimrafSync } from 'rimraf'
// import camelcaseKeys from 'camelcase-keys'

export class UploadManager {
  private readonly _dataFolder: string = './data/'
  private _folderWatcher: FolderWatcher | undefined = undefined
  private readonly _uploadChannel: RealtimeChannel
  private readonly _supabase: SupabaseClient
  private _deviceId: string | undefined = undefined

  constructor (client: RecastClient) {
    this.initialize(client)
    this._uploadChannel = this.createChannel(client)
    this._uploadChannel.subscribe()
    this._supabase = client.supabase
  }

  private createChannel (client: RecastClient): RealtimeChannel {
    return client.supabase
      .channel('upload')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'upload',
          filter: 'active=eq.true'
        },
        (payload: any) => {
          try {
            // payload = camelcaseKeys(payload);
            // this.open(payload.new.localFolderName);
            this.open(payload.new.local_folder_name)
          } catch (error) {
            console.error(error)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'upload',
          filter: 'active=eq.false'
        },
        (payload: any) => {
          try {
            this.close(payload.new.bucket, payload.new.prefix)
          } catch (error) {
            console.error(error)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'devices'
        },
        (payload: any) => {
          try {
            // payload = camelcaseKeys(payload);
            // this.setDeviceId(payload.deviceId)
            this.setDeviceId(payload.device_id)
          } catch (error) {
            console.error(error)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'devices'
        },
        (payload: any) => {
          try {
            // payload = camelcaseKeys(payload);
            // this.setDeviceId(payload.deviceId)
            this.setDeviceId(payload.device_id)
          } catch (error) {
            console.error(error)
          }
        }
      )
  }

  private async initialize (client: RecastClient): Promise<void> {
    this.clear()

    try {
      this.setDeviceId(await this.readDeviceId(client))
    } catch (error) {
      console.error(error)
    }

    if (!this._deviceId) {
      console.info('UploadManager: waiting for deviceId.')
      return
    }

    try {
      this.checkOnStartupForActiveUpload(client)
    } catch (error) {
      console.error(error)
    }
  }

  private async readDeviceId (client: RecastClient): Promise<string> {
    const { data, error } = await client.supabase
      .from('devices')
      .select('device_id')

    if ((error != null) || !data?.length) {
      throw new Error('UploadManager: no deviceId found in database.')
    }

    return data[0].device_id
  }

  private async checkOnStartupForActiveUpload (
    client: RecastClient
  ): Promise<void> {
    const { data, error } = await client.supabase
      .from('upload')
      .select('*')
      .eq('device_id', this._deviceId)
      .is('active', true)

    if (error != null) {
      throw new Error('UploadManager: cannot look for active uploads in database.')
    }

    if (!data?.length) {
      console.info(
        'UploadManager: no active upload found on startup. Waiting for update.'
      )
    }

    console.info('UploadManager: active upload found.')
    this.startWatcher(data[0].local_folder_name)
  }

  private startWatcher (folderPath: string): void {
    const relativeFolderPath: string = this._dataFolder + folderPath
    try {
      this._folderWatcher = new FolderWatcher(relativeFolderPath)
    } catch (error) {
      console.error('UploadManager: upload failed', error)
    }
  }

  private stopWatcher (): string | undefined {
    let currentPaths: string[] = []
    if (this._folderWatcher !== undefined) {
      try {
        currentPaths = this._folderWatcher.currentPaths
      } catch (error) {
        console.error('UploadManager: folderWatcher does not respond', error)
      }
    }
    return this.getLatestFilePath(currentPaths)
  }

  private getLatestFilePath (currentPaths: string[]): string | undefined {
    const latestFilePath = currentPaths.pop()
    return typeof latestFilePath === 'undefined' ? undefined : './' + latestFilePath
  }

  private setDeviceId (
    deviceID: string
  ): void {
    this._deviceId = deviceID
    console.info(`UploadManager: found deviceId "${this._deviceId}"`)
  }

  private open (
    folderName: string
  ): void {
    console.info(`UploadManager: active upload found for local folder "${folderName}"`)
    this.startWatcher(folderName)
  }

  private async close (
    bucket: string,
    prefix: string
  ): Promise<void> {
    const filePath: string | undefined = this.stopWatcher()

    if (filePath !== undefined) {
      console.info('UploadManager: upload latest file.')
      try {
        this.upload(bucket, prefix, filePath)
      } catch (error) {
        console.error('UploadManager: upload failed.', error)
      }
    } else {
      console.info('UploadManager: nothing to upload.')
    }

    console.info('UploadManager: waiting for upload.')
  }

  private async upload (
    bucket: string,
    prefix: string,
    filePath: string
  ): Promise<void> {
    const localfilepath: string = filePath
    const s3filepath: string = prefix + '/' + pathBasename(filePath)
    const url: string = bucket + '/' + s3filepath

    console.debug(`UploadManager: upload ${filePath} to s3://${url}`)
    const fileBuffer = fsReadFileSync(localfilepath)
    const { data, error } = await this._supabase.storage
      .from(bucket)
      .upload(s3filepath, fileBuffer, {
        cacheControl: '3600',
        upsert: false
      })
    if (error == null) {
      console.debug(data)
    } else {
      console.error(error)
    }
    this.clear()
  }

  private clear (): void {
    const dataPath = pathResolve(process.cwd(), this._dataFolder)
    console.debug(`UploadManager: clear ${dataPath}`)
    rimrafSync(dataPath)
  }
}
