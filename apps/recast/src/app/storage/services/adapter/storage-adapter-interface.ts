import {
  Element,
  Process,
  StorageBackend,
} from '../../../../../build/openapi/recast';
import { Observable } from 'rxjs';
import {
  ElementViewModel,
  ElementViewProperty,
  ViewModelValueType,
} from '../../../model/element-view-model';

export interface StorageAdapterInterface {
  getType(): StorageBackend;
  loadValue$(
    elementViewProperty: ElementViewProperty
  ): Observable<ViewModelValueType>;
  saveValues$(elementViewModel: ElementViewModel): Observable<ElementViewModel>;
  deleteElement$(element: Element): Observable<void>;
  deleteProcess$(process: Process): Observable<void>;
}
