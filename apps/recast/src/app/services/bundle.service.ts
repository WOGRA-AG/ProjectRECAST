import { Injectable } from '@angular/core';
import { SupabaseService, Tables } from './supabase.service';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  from,
  map,
  merge,
  Observable,
  of,
  Subject,
  take,
} from 'rxjs';
import {
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  SupabaseClient,
} from '@supabase/supabase-js';
import { snakeCaseKeys, camelCaseKeys } from '../shared/util/common-utils';
import { Bundle } from '../../../build/openapi/recast';

@Injectable({
  providedIn: 'root',
})
export class BundleService {
  private readonly _bundles$: BehaviorSubject<Bundle[]> = new BehaviorSubject<
    Bundle[]
  >([]);
  private readonly _supabaseClient: SupabaseClient = this.supabase.supabase;

  constructor(private readonly supabase: SupabaseService) {
    const sessionChanges$ = supabase.currentSession$.pipe(
      concatMap(() => this.loadBundles$()),
      catchError(() => of([]))
    );
    merge(this.bundleChanges$(), sessionChanges$).subscribe(bundles => {
      this._bundles$.next(bundles);
    });
  }

  get bundles$(): Observable<Bundle[]> {
    return this._bundles$;
  }

  get bundles(): Bundle[] {
    return this._bundles$.getValue();
  }

  public updateBundles(): void {
    this.loadBundles$()
      .pipe(take(1))
      .subscribe(bundles => {
        this._bundles$.next(bundles);
      });
  }

  public upsertBundle(bundle: Bundle): Observable<Bundle> {
    const upsert = this._supabaseClient
      .from(Tables.bundles)
      .upsert(snakeCaseKeys(bundle))
      .select();
    return from(upsert).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return camelCaseKeys(data[0] as Bundle);
      })
    );
  }

  private loadBundles$(): Observable<Bundle[]> {
    const select = this._supabaseClient.from(Tables.bundles).select(`*`);
    return from(select).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }
        return camelCaseKeys(data as Bundle[]);
      })
    );
  }

  private bundleChanges$(): Observable<Bundle[]> {
    const changes$: Subject<Bundle[]> = new Subject<Bundle[]>();
    this._supabaseClient
      .channel('bundle-change')
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: 'public',
          table: Tables.bundles,
        },
        payload => {
          const state = this._bundles$.getValue();
          switch (payload.eventType) {
            case 'INSERT': {
              changes$.next(
                this.insertBundle(state, camelCaseKeys(payload.new))
              );
              break;
            }
            case 'UPDATE': {
              changes$.next(
                this.updateBundle(state, camelCaseKeys(payload.new))
              );
              break;
            }
            case 'DELETE': {
              changes$.next(
                this.deleteBundle(state, camelCaseKeys(payload.old))
              );
              break;
            }
            default: {
              break;
            }
          }
        }
      )
      .subscribe();
    return changes$;
  }

  private insertBundle(state: Bundle[], bundle: Bundle): Bundle[] {
    return [...state, bundle];
  }

  private deleteBundle(state: Bundle[], bundle: Bundle): Bundle[] {
    return state.filter(b => b.id !== bundle.id);
  }

  private updateBundle(state: Bundle[], bundle: Bundle): Bundle[] {
    return state.map(b => (b.id === bundle.id ? bundle : b));
  }
}
