import * as chokidar from "chokidar";

export class Watcher {
  private chokidarWatcher: chokidar.FSWatcher | undefined;
  private currentPaths: string[];

  constructor() {
    this.currentPaths = [];
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

  start(path: string) {
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

