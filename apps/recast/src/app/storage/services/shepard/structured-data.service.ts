import { Injectable } from '@angular/core';
import {
  Configuration,
  StructuredData,
  StructureddataApi,
  StructuredDataContainer,
  StructuredDataPayload,
} from '@dlr-shepard/shepard-client';
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  from,
  map,
  Observable,
  switchMap,
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
export class StructuredDataService {
  private _structuredDataApi: StructureddataApi | undefined;
  private _strucDataContainers: BehaviorSubject<StructuredDataContainer[]> =
    new BehaviorSubject<StructuredDataContainer[]>([]);
  private readonly _structuredDataContainerName: string = environment.production
    ? 'recast'
    : 'recast-dev';
  constructor(private readonly userService: UserFacadeService) {
    this.userService.currentProfile$
      .pipe(filter(isShepardUser))
      .subscribe(profile => {
        const config: Configuration = new Configuration({
          basePath: profile.shepardUrl,
          apiKey: profile.shepardApiKey,
        });
        this._structuredDataApi = new StructureddataApi(config);
        this.initStructuredDataContainers$().subscribe();
      });
  }

  get structuredDataContainers$(): Observable<StructuredDataContainer[]> {
    return this._strucDataContainers.pipe(
      distinctUntilChanged(elementComparator)
    );
  }

  public getRecastStructuredDataContainer$(): Observable<StructuredDataContainer> {
    return this.getStructuredDataContainerByName$(
      this._structuredDataContainerName
    );
  }

  public getStructuredDataPayload$(
    structuredDataOid: string
  ): Observable<StructuredDataPayload> {
    return this.getRecastStructuredDataContainer$().pipe(
      switchMap(container =>
        this._structuredDataApi!.getStructuredData({
          structureddataContainerId: container.id!,
          oid: structuredDataOid,
        })
      )
    );
  }

  public createStructuredData$(
    structureddataContainerId: number,
    payload: StructuredDataPayload
  ): Observable<StructuredData> {
    return from(
      this._structuredDataApi!.createStructuredData({
        structureddataContainerId,
        structuredDataPayload: payload,
      })
    );
  }

  public upsertStructuredData$(
    structuredDataContainerId: number,
    structuredDataName: string,
    propertyName: string,
    value: string
  ): Observable<StructuredData> {
    const structureddataContainerId: number = structuredDataContainerId;
    return this.getStructuredData$(structureddataContainerId).pipe(
      map(sd => sd.find(e => e.name === structuredDataName)),
      switchMap(sd => {
        if (!sd) {
          return this._createStructuredData$(
            structureddataContainerId,
            propertyName,
            structuredDataName,
            value
          );
        }
        return this._updateStructuredData$(
          structureddataContainerId,
          propertyName,
          sd,
          value
        );
      })
    );
  }

  public getStructuredData$(containerId: number): Observable<StructuredData[]> {
    const req = this._structuredDataApi!.getAllStructuredDatas({
      structureddataContainerId: containerId,
    });
    return from(req).pipe(distinctUntilChanged(elementComparator));
  }

  private getStructuredDataContainerByName$(
    name: string
  ): Observable<StructuredDataContainer> {
    return this.structuredDataContainers$.pipe(
      map(sdc => sdc.find(c => c.name === name)),
      filter(Boolean)
    );
  }
  private _updateStructuredData$(
    structureddataContainerId: number,
    propertyName: string,
    strucData: StructuredData,
    value: string
  ): Observable<StructuredData> {
    return from(
      this._structuredDataApi!.getStructuredData({
        structureddataContainerId,
        oid: strucData.oid!,
      })
    ).pipe(
      switchMap(strucDataPay =>
        this._deleteStructuredData$(strucData, structureddataContainerId).pipe(
          map(() => strucDataPay)
        )
      ),
      switchMap((sdp: StructuredDataPayload) => {
        let payload = sdp.payload ? JSON.parse(sdp.payload) : {};
        payload[propertyName] = value;
        delete payload._id;
        delete payload._meta;
        payload = JSON.stringify(payload);
        return from(
          this._structuredDataApi!.createStructuredData({
            structureddataContainerId,
            structuredDataPayload: {
              structuredData: { name: strucData.name },
              payload,
            },
          })
        );
      })
    );
  }

  private _createStructuredData$(
    structureddataContainerId: number,
    propertyName: string,
    elementName: string,
    value: string
  ): Observable<StructuredData> {
    const payload = JSON.stringify({ [propertyName]: value });
    const structuredDataPayload = {
      structuredData: { name: elementName },
      payload,
    };
    return from(
      this._structuredDataApi!.createStructuredData({
        structureddataContainerId,
        structuredDataPayload,
      })
    );
  }

  private _deleteStructuredData$(
    strucData: StructuredData,
    structureddataContainerId: number
  ): Observable<void> {
    return from(
      this._structuredDataApi!.deleteStructuredData({
        structureddataContainerId,
        oid: strucData.oid!,
      })
    );
  }

  private initStructuredDataContainers$(): Observable<void> {
    return from(
      this._structuredDataApi!.getAllStructuredDataContainers({})
    ).pipe(
      map(sdc => {
        if (!sdc.some(c => c.name === this._structuredDataContainerName)) {
          this._structuredDataApi
            ?.createStructuredDataContainer({
              structuredDataContainer: {
                name: this._structuredDataContainerName,
              },
            })
            .then(value =>
              this._strucDataContainers.next(
                this.insertStructuredDataContainer(sdc, value)
              )
            );
        }
        this._strucDataContainers.next(sdc);
      })
    );
  }

  private insertStructuredDataContainer(
    containers: StructuredDataContainer[],
    container: StructuredDataContainer
  ): StructuredDataContainer[] {
    return containers.concat(container);
  }
}
