import { FSWatcher } from 'chokidar';
import { watch as chokidarWatch } from 'chokidar';
import { mkdirp } from 'mkdirp'

export class FolderWatcher {
  private chokidarFolderWatcher: FSWatcher | undefined;
  private currentPaths: string[] = [];
  private ready: boolean = true;

  private async create_folder(path: string): Promise<void> {
    try {
        const made = await mkdirp(path);
        console.debug(`FolderWatcher: made directories, starting with ${made}`);
    } catch (error: any) {
      switch (error.code) {
        case 'ENOENT': 
            console.error(`FolderWatcher: error creating directory, ${error.message}`);
            break;
        case  'EEXIST': 
            console.error(`FolderWatcher: directory already exists, ${error.message}`);
            break;
        case 'EACCES':
            console.error(`FolderWatcher: permission denied, ${error.message}`);
            break;
        default: 
            throw error;
        }
    }
  }

  private add_filepath(path: string): void {
    this.currentPaths.push(path);
    console.debug(`FolderWatcher: added "${path}" to current paths.`);
  }
  
  private remove_filepath(path: string): void {
    console.debug(`FolderWatcher: remove "${path}" to current paths.`);
    this.currentPaths = this.currentPaths.filter(element => element !== path);
  }

  async start(relativeFolderPath: string): Promise<void> {
    this.reset();

    if (this.ready) {
      try {
        await this.create_folder(relativeFolderPath);
      } catch (error) {
        console.error("FolderWatcher: create folder error ", error);
      }

      this.chokidarFolderWatcher = chokidarWatch(relativeFolderPath, {});
      this.chokidarFolderWatcher
        .on("add", (path: string) => this.add_filepath(path))
        .on("change", (path: string) => this.add_filepath(path))
        .on("unlink", (path: string) => this.remove_filepath(path));
    } else {
      console.debug('FolderWatcher: already watching...')
    }
  }

  stop() : string[] {
    const currentPaths = this.currentPaths;
    this.reset();
    return currentPaths;
  }

  private reset(): void {
    if (this.chokidarFolderWatcher) {
      this.chokidarFolderWatcher.close();
    }

    this.currentPaths = [];
    this.chokidarFolderWatcher = undefined;
    this.ready = true;
  }
}

