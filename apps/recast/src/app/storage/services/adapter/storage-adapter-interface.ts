import {
  Element,
  ElementProperty,
  Process,
  StepProperty,
} from '../../../../../build/openapi/recast';
import TypeEnum = StepProperty.TypeEnum;
import StorageBackendEnum = ElementProperty.StorageBackendEnum;
import { Observable } from 'rxjs';
import {
  ElementViewProperty,
  ValueType,
} from '../../../model/element-view-model';

export interface StorageAdapterInterface {
  getType(): StorageBackendEnum;
  loadValue$(
    elementId: number,
    elementViewProperty: ElementViewProperty
  ): Observable<ValueType>;
  saveValue(
    element: Element,
    stepProperty: StepProperty,
    value: any,
    type: TypeEnum
  ): Promise<void>;
  deleteElement$(element: Element): Observable<void>;
  deleteProcess$(process: Process): Observable<void>;
}
