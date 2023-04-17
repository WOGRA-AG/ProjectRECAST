import {
  ElementProperty,
  StepProperty,
} from '../../../../build/openapi/recast';
import TypeEnum = StepProperty.TypeEnum;
import StorageBackendEnum = ElementProperty.StorageBackendEnum;

export interface StorageAdapterInterface {
  getType(): StorageBackendEnum;
  loadValue(val: string | undefined): string;
  saveValue(
    elementId: number | undefined,
    property: StepProperty,
    value: any,
    type: TypeEnum
  ): void;
}
