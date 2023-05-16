import { Injectable } from '@angular/core';
import {
  Configuration,
  FileApi,
  FileContainer,
  ShepardFile,
} from '@dlr-shepard/shepard-client';
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  from,
  map,
  Observable,
} from 'rxjs';
import { environment } from '../../../../environments/environment';
import { UserFacadeService } from '../../../user/services/user-facade.service';
import {
  elementComparator,
  isShepardUser,
} from '../../../shared/util/common-utils';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  private _fileApi: FileApi | undefined;
  private _fileContainers: BehaviorSubject<FileContainer[]> =
    new BehaviorSubject<FileContainer[]>([]);
  private readonly _fileContainerName: string = environment.production
    ? 'recast'
    : 'recast-dev';
  constructor(private readonly userService: UserFacadeService) {
    this.userService.currentProfile$
      .pipe(filter(isShepardUser))
      .subscribe(profile => {
        const config: Configuration = new Configuration({
          basePath: environment.shepardUrl,
          apiKey: profile.shepardApiKey,
        });
        this._fileApi = new FileApi(config);
        this.initFileContainers$().subscribe();
      });
  }

  get fileContainers$(): Observable<FileContainer[]> {
    return this._fileContainers.pipe(distinctUntilChanged(elementComparator));
  }

  public getRecastFileContainer$(): Observable<FileContainer> {
    return this.getFileContainerByName$(this._fileContainerName);
  }

  public getAllFiles$(fileContainerId: number): Observable<ShepardFile[]> {
    return from(this._fileApi!.getAllFiles({ fileContainerId }));
  }

  public getFileByOid$(
    fileContainerId: number,
    oid: string
  ): Observable<ShepardFile | undefined> {
    return from(
      this.getAllFiles$(fileContainerId).pipe(
        map(files => files.find(f => f.oid === oid))
      )
    );
  }

  public getBlobByOid$(fileContainerId: number, oid: string): Observable<Blob> {
    return from(this._fileApi!.getFile({ fileContainerId, oid }));
  }

  public createFile$(
    fileContainerId: number,
    file: File
  ): Observable<ShepardFile> {
    return from(this._fileApi!.createFile({ fileContainerId, file }));
  }

  public deleteFileByOid$(
    fileContainerId: number,
    oid: string
  ): Observable<void> {
    return from(this._fileApi!.deleteFile({ fileContainerId, oid }));
  }

  private getFileContainerByName$(
    fileContainerName: string
  ): Observable<FileContainer> {
    return this.fileContainers$.pipe(
      map(fileContainers =>
        fileContainers.find(c => c.name === fileContainerName)
      ),
      filter(Boolean)
    );
  }

  private initFileContainers$(): Observable<void> {
    return from(this._fileApi!.getAllFileContainers({})).pipe(
      map(fc => {
        if (!fc.some(c => c.name === this._fileContainerName)) {
          this._fileApi
            ?.createFileContainer({
              fileContainer: { name: this._fileContainerName },
            })
            .then(value =>
              this._fileContainers.next(this.insertFileContainer(fc, value))
            );
        }
        this._fileContainers.next(fc);
      })
    );
  }

  private insertFileContainer(
    fileContainers: FileContainer[],
    fileContainer: FileContainer
  ): FileContainer[] {
    return fileContainers.concat(fileContainer);
  }
}
