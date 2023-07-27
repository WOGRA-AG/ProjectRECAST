import {
  Process,
  Element,
  Step,
  StorageBackend,
  ValueType,
} from '../../../build/openapi/recast';

export interface ElementViewModel {
  element: Element;
  process: Process;
  storageBackends: StorageBackend[];
  currentStep?: Step;
  sortedSteps: Step[];
  properties: ElementViewProperty[];
}

export interface ElementViewProperty {
  type: ValueType;
  label: string;
  hint: string;
  stepPropId: number;
  stepId: number;
  storageBackend?: StorageBackend;
  defaultValue: ViewModelValueType;
  value?: ViewModelValueType;
}

export type ShepardValue = { type: string; value: any };

export type ViewModelValueType =
  | string
  | boolean
  | number
  | File
  | Element
  | ShepardValue;
