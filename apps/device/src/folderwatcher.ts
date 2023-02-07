import { FSWatcher } from 'chokidar';
import { watch as chokidarWatch } from 'chokidar';
import { mkdirp } from 'mkdirp'

export class FolderWatcher {
  private chokidarFolderWatcher: FSWatcher | undefined;
  private currentPaths: string[] = [];

  async create_folder(path: string) {
    try {
        await mkdirp(path).then(made => made && console.log(`FolderWatcher: made directories, starting with ${made}`));
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.error(`FolderWatcher: error creating directory, ${error.message}`);
        } else if (error.code === 'EEXIST') {
            console.error(`FolderWatcher: directory already exists, ${error.message}`);
        } else if (error.code === 'EACCES') {
            console.error(`FolderWatcher: permission denied, ${error.message}`);
        } else {
            throw error;
        }
    }
  }

  add_filepath(path: string) {
    this.currentPaths.push(path);
    console.log(`FolderWatcher: added "${path}" to current paths.`);
  }
  
  remove_filepath(path: string) {
    this.currentPaths.pop();
    console.log(`FolderWatcher: remove "${path}" to current paths.`);
    this.currentPaths = this.currentPaths.filter(element => element !== path);
  }

  async start(relativeFolderPath: string) {
    await this.create_folder(relativeFolderPath);

    this.currentPaths = [];
    this.chokidarFolderWatcher = chokidarWatch(relativeFolderPath, {});
    this.chokidarFolderWatcher
      .on("add", (path: string) => this.add_filepath(path))
      .on("change", (path: string) => this.add_filepath(path))
      .on("unlink", (path: string) => this.remove_filepath(path));
  }

  stop() : string | undefined {
    if (this.chokidarFolderWatcher) {
      this.chokidarFolderWatcher.close();
    }
    const latestFilePath = this.currentPaths.pop();
    if (typeof latestFilePath == 'undefined') {
      return undefined;
    } else {
      return './' + latestFilePath;
    }
  }
}

