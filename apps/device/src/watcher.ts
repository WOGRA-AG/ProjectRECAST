import * as chokidar from "chokidar";

export class Watcher {
  private chokidarWatcher: chokidar.FSWatcher | undefined;

  start(path: string) {
    this.chokidarWatcher = chokidar.watch(path, {});

    this.chokidarWatcher
      .on("add", (path: string) => console.log(`File ${path} has been added`))
      .on("change", (path: string) => console.log(`File ${path} has been changed`))
      .on("unlink", (path: string) => console.log(`File ${path} has been removed`));
  }

  stop() {
    if (this.chokidarWatcher) {
      this.chokidarWatcher.close();
    }
  }
}

