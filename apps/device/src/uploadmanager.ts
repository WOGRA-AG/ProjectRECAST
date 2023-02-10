import { FolderWatcher } from './folderwatcher'
import 'dotenv/config'
import { type RecastClient } from './recastclient'
import {
  type RealtimeChannel,
  type RealtimePostgresInsertPayload,
  type SupabaseClient
} from '@supabase/supabase-js'
import { readFileSync as fsReadFileSync } from 'fs'
import { basename as pathBasename, resolve as pathResolve } from 'path'
import { sync as rimrafSync } from 'rimraf'

export class UploadManager {
  private readonly _dataFolder: string = './data/'
  private _folderWatcher: FolderWatcher | undefined = undefined
  private readonly _uploadChannel: RealtimeChannel
  private readonly _supabase: SupabaseClient
  private _device_id: string | undefined = undefined

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
            this.open(payload)
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
            this.close(payload)
          } catch (error) {
            console.error(error)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'devices' },
        (payload: any) => {
          try {
            this.updateDeviceId(payload)
          } catch (error) {
            console.error(error)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'devices' },
        (payload: any) => {
          try {
            this.updateDeviceId(payload)
          } catch (error) {
            console.error(error)
          }
        }
      )
  }

  private async initialize (client: RecastClient): Promise<void> {
    this.clear()

    try {
      this._device_id = await this.getDeviceId(client)
    } catch (error) {
      console.error('UploadManager: no device_id.')
    }

    if (this._device_id !== undefined) {
      console.info(`UploadManager: using device_id "${this._device_id}".`)
      try {
        this.checkOnStartupForActiveUpload(client)
      } catch (error) {
        console.error(error)
      }
    } else {
      console.log('UploadManager: waiting for device_id.')
    }
  }

  private async getDeviceId (client: RecastClient): Promise<string> {
    const { data, error } = await client.supabase
      .from('devices')
      .select('device_id')
    if (error == null && data?.length > 0) {
      const device_id: string = data[0].device_id
      return device_id
    } else {
      throw new Error('UploadManager: no device_id found in database.')
    }
  }

  private async checkOnStartupForActiveUpload (
    client: RecastClient
  ): Promise<void> {
    const { data, error } = await client.supabase
      .from('upload')
      .select('*')
      .eq('device_id', this._device_id)
      .is('active', true)
    if (error == null && data?.length > 0) {
      const prefix: string = data[0].prefix
      console.info(
        `UploadManager: active upload found on startup for prefix "${prefix}".`
      )
      this.startWatcher(data[0].local_folder_name)
    } else {
      console.info(
        'UploadManager: no active upload found on startup. Waiting for Upload'
      )
    }
  }

  private startWatcher (folderPath: string) {
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
        currentPaths = this._folderWatcher.getCurrentPaths()
      } catch (error) {
        console.error('UploadManager: folderWatcher does not respond', error)
      }
    }
    return this.getLatestFilePath(currentPaths)
  }

  private getLatestFilePath (currentPaths: string[]): string | undefined {
    const latestFilePath = currentPaths.pop()

    if (typeof latestFilePath === 'undefined') {
      return undefined
    } else {
      return './' + latestFilePath
    }
  }

  private updateDeviceId<T extends Record<string, any>>(
    payload: RealtimePostgresInsertPayload<T>
  ): void {
    this._device_id = payload.new.device_id
    console.info(`UploadManager: found new device_id "${this._device_id}"`)
  }

  private open<T extends Record<string, any>>(
    payload: RealtimePostgresInsertPayload<T>
  ): void {
    const prefix: string = payload.new.prefix
    console.info(`UploadManager: active upload found for prefix "${prefix}"`)
    this.startWatcher(payload.new.local_folder_name)
  }

  private async close<T extends Record<string, any>>(
    payload: RealtimePostgresInsertPayload<T>
  ): Promise<void> {
    const filePath: string | undefined = this.stopWatcher()

    if (filePath != undefined) {
      console.info(`UploadManager: upload ${filePath}.`)
      try {
        this.upload(payload.new.bucket, payload.new.prefix, filePath)
      } catch (error) {
        console.error('UploadManager: upload failed', error)
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
