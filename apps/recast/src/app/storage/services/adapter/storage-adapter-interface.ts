import {
  Element,
  ElementProperty,
  StepProperty,
} from '../../../../../build/openapi/recast';
import TypeEnum = StepProperty.TypeEnum;
import StorageBackendEnum = ElementProperty.StorageBackendEnum;
import { Observable } from 'rxjs';

export interface StorageAdapterInterface {
  getType(): StorageBackendEnum;
  loadValue$(
    elementProperty: ElementProperty,
    type: TypeEnum
  ): Observable<string | File>;
  saveValue(
    element: Element,
    stepProperty: StepProperty,
    value: any,
    type: TypeEnum
  ): Promise<void>;
  deleteElement$(element: Element): Observable<void>;
}
