import { Inject, Injectable } from '@angular/core';
import { ElementProperty, StepProperty } from '../../../build/openapi/recast';
import StorageBackendEnum = ElementProperty.StorageBackendEnum;
import { StorageAdapterInterface } from './adapter/storage-adapter-interface';

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
    storageBackend: StorageBackendEnum
  ): string {
    const storageAdapter = this.storageAdapters.find(
      adapter => adapter.getType() === storageBackend
    );

    if (!storageAdapter) {
      throw new Error(`No such Storage Backend: ${storageBackend}`);
    }

    return storageAdapter.loadValue(val);
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

    storageAdapter.saveValue(elementId, property, value, property.type!);
  }
}
