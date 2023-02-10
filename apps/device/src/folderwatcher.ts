import { type FSWatcher, watch as chokidarWatch } from 'chokidar'
import { mkdirp } from 'mkdirp'

export class FolderWatcher {
  private _chokidarFolderWatcher: FSWatcher | undefined
  private _currentPaths: string[] = []

  constructor (relativeFolderPath: string) {
    this.start(relativeFolderPath)
  }

  private async start (relativeFolderPath: string): Promise<void> {
    try {
      await this.createFolder(relativeFolderPath)
    } catch (error) {
      console.error('FolderWatcher: create folder error ', error)
    }

    this._chokidarFolderWatcher = chokidarWatch(relativeFolderPath, {})
    this._chokidarFolderWatcher
      .on('add', (path: string) => {
        this.addFilepath(path)
      })
      .on('change', (path: string) => {
        this.addFilepath(path)
      })
      .on('unlink', (path: string) => {
        this.removeFilepath(path)
      })
  }

  private async createFolder (path: string): Promise<void> {
    try {
      const made = await mkdirp(path)
      console.debug(`FolderWatcher: made directories, starting with ${made}`)
    } catch (error: any) {
      switch (error.code) {
        case 'ENOENT':
          console.error(
            `FolderWatcher: error creating directory, ${error.message}`
          )
          break
        case 'EEXIST':
          console.error(
            `FolderWatcher: directory already exists, ${error.message}`
          )
          break
        case 'EACCES':
          console.error(`FolderWatcher: permission denied, ${error.message}`)
          break
        default:
          throw error
      }
    }
  }

  private addFilepath (path: string): void {
    this._currentPaths.push(path)
    console.debug(`FolderWatcher: added "${path}" to current paths.`)
  }

  private removeFilepath (path: string): void {
    console.debug(`FolderWatcher: remove "${path}" to current paths.`)
    this._currentPaths = this._currentPaths.filter(element => element !== path)
  }

  getCurrentPaths (): string[] {
    return this._currentPaths
  }
}
