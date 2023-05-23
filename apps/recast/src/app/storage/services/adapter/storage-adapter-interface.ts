import {
  Element,
  ElementProperty,
  Process,
} from '../../../../../build/openapi/recast';
import StorageBackendEnum = ElementProperty.StorageBackendEnum;
import { Observable } from 'rxjs';
import {
  ElementViewModel,
  ElementViewProperty,
  ValueType,
} from '../../../model/element-view-model';

export interface StorageAdapterInterface {
  getType(): StorageBackendEnum;
  loadValue$(
    elementId: number,
    elementViewProperty: ElementViewProperty
  ): Observable<ValueType>;
  saveValues$(elementViewModel: ElementViewModel): Observable<ElementViewModel>;
  deleteElement$(element: Element): Observable<void>;
  deleteProcess$(process: Process): Observable<void>;
}
