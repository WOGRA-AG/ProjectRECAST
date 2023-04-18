import {
  ElementProperty,
  StepProperty,
} from '../../../../build/openapi/recast';
import TypeEnum = StepProperty.TypeEnum;
import StorageBackendEnum = ElementProperty.StorageBackendEnum;

export interface StorageAdapterInterface {
  getType(): StorageBackendEnum;
  loadValue(val: string | undefined, type: TypeEnum): Promise<string>;
  saveValue(
    elementId: number | undefined,
    property: StepProperty,
    value: any,
    type: TypeEnum,
    storageBackend: StorageBackendEnum
  ): void;
}
