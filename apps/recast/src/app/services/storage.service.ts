import { Inject, Injectable } from '@angular/core';
import { ElementProperty, StepProperty } from '../../../build/openapi/recast';
import StorageBackendEnum = ElementProperty.StorageBackendEnum;
import { StorageAdapterInterface } from './adapter/storage-adapter-interface';
import TypeEnum = StepProperty.TypeEnum;
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  constructor(
    @Inject('StorageAdapterInterface')
    private readonly storageAdapters: StorageAdapterInterface[]
  ) {}

  public loadValue(
    val: string | undefined,
    type: TypeEnum,
    storageBackend: StorageBackendEnum
  ): Observable<string> {
    const storageAdapter = this.storageAdapters.find(
      adapter => adapter.getType() === storageBackend
    );

    if (!storageAdapter) {
      throw new Error(`No such Storage Backend: ${storageBackend}`);
    }

    return from(storageAdapter.loadValue(val, type));
  }

  public updateValue(
    elementId: number | undefined,
    property: StepProperty,
    value: any,
    storageBackend: StorageBackendEnum
  ): void {
    const storageAdapter = this.storageAdapters.find(
      adapter => adapter.getType() === storageBackend
    );

    if (!storageAdapter) {
      throw new Error(`No such Storage Backend: ${storageBackend}`);
    }

    storageAdapter.saveValue(
      elementId,
      property,
      value,
      property.type!,
      storageBackend
    );
  }
}
