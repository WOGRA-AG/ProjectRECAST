import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Bucket } from '@supabase/storage-js';
import { SupabaseService } from '../../../services';
import {
  BehaviorSubject,
  catchError,
  distinctUntilChanged,
  filter,
  from,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
} from 'rxjs';
import { elementComparator } from '../../../shared/util/common-utils';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  private readonly _supabaseClient: SupabaseClient = this.supabase.supabase;
  private readonly _buckets: BehaviorSubject<Bucket[]> = new BehaviorSubject<
    Bucket[]
  >([]);
  private readonly _fileBucketName: string = 'files';
  constructor(private readonly supabase: SupabaseService) {
    supabase.currentSession$
      .pipe(
        switchMap(() => this.loadBuckets$()),
        catchError(() => of([])),
        takeUntilDestroyed()
      )
      .subscribe(buckets => this._buckets.next(buckets));
  }

  public getBucketByName$(bucketName: string): Observable<Bucket | undefined> {
    return this._buckets.pipe(
      map(buckets => buckets.find(bucket => bucket.name === bucketName))
    );
  }

  public saveFile$(
    path: string,
    file: File,
    bucketName: string = this._fileBucketName
  ): Observable<string> {
    return this._buckets.pipe(
      map(buckets => buckets.find(bucket => bucket.name === bucketName)),
      mergeMap(bucket => {
        if (!bucket) {
          return this.createBucket$(bucketName, {
            public: false,
          });
        }
        return of(bucket);
      }),
      mergeMap(bucket =>
        this._supabaseClient.storage
          .from(bucket.name)
          .upload(path, file, { upsert: true })
      ),
      filter(({ data, error }) => !!data || !!error),
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return data?.path;
      })
    );
  }

  public getFile$(
    filePath: string,
    bucketName: string = this._fileBucketName
  ): Observable<File> {
    const req = this._supabaseClient.storage
      .from(bucketName)
      .download(filePath);
    return from(req).pipe(
      filter(({ data, error }) => !!data || !!error),
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return new File([data], filePath.split('/').pop() ?? 'unnamed_file');
      })
    );
  }

  public deleteFile$(
    filePath: string,
    bucketName: string = this._fileBucketName
  ): Observable<void> {
    return from(
      this._supabaseClient.storage.from(bucketName).remove([filePath])
    ).pipe(
      filter(({ data, error }) => !!data || !!error),
      map(({ error }) => {
        if (error) {
          throw error;
        }
      })
    );
  }

  private loadBuckets$(): Observable<Bucket[]> {
    return from(this._supabaseClient.storage.listBuckets()).pipe(
      filter(({ data, error }) => !!data || !!error),
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
      distinctUntilChanged(elementComparator)
    );
  }

  private createBucket$(
    bucketName: string,
    options?: BucketOptions
  ): Observable<Bucket> {
    return from(
      this._supabaseClient.storage.createBucket(bucketName, options)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const bucket = <Bucket>data;
        this._buckets.next([...this._buckets.getValue(), bucket]);
        return bucket;
      }),
      distinctUntilChanged(elementComparator)
    );
  }

  private getBucket$(bucketName: string): Observable<Bucket> {
    return from(this._supabaseClient.storage.getBucket(bucketName)).pipe(
      filter(({ data, error }) => !!data || !!error),
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
      distinctUntilChanged(elementComparator)
    );
  }
}

type BucketOptions = {
  public: boolean;
  allowedMimeTypes?: string[];
  fileSizeLimit?: null | string | number;
};
