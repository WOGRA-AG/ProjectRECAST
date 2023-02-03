import * as chokidar from "chokidar";
import { mkdirp } from 'mkdirp'

export class FolderWatcher {
  private chokidarWatcher: chokidar.FSWatcher | undefined;
  private currentPaths: string[];

  constructor() {
    this.currentPaths = [];
  }
  
  async create_folder(path: string): Promise<string> {
    let made = mkdirp.sync(path);
    path = typeof made == 'string' ? made : path;
    return path;
  }

  add(path: string) {
    this.currentPaths.push(path);
    console.log(`Watcher: added "${path}"`);
  }
  
  remove(path: string) {
    this.currentPaths.pop();
    console.log(`Watcher: remove "${path}"`);
    this.currentPaths = this.currentPaths.filter(element => element !== path);
  }

  async start(path: string) {
    path = await this.create_folder(path);
    this.currentPaths = [];
    this.chokidarWatcher = chokidar.watch(path, {});

    this.chokidarWatcher
      .on("add", (path: string) => this.add(path))
      .on("change", (path: string) => this.add(path))
      .on("unlink", (path: string) => this.remove(path));
  }

  stop() : string | undefined {
    if (this.chokidarWatcher) {
      this.chokidarWatcher.close();
    }
    return this.currentPaths.pop()
  }
}

