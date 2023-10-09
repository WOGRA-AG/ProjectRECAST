import {
  Process,
  Element,
  Step,
  StorageBackend,
  ValueType,
  PredictionTemplate,
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
  required: boolean;
  storageBackend?: StorageBackend;
  defaultValue: ViewModelValueType;
  value?: ViewModelValueType;
  predictionTemplate?: PredictionTemplate;
}

export type ShepardValue = { type: string; value: any };

export type ViewModelValueType =
  | string
  | boolean
  | number
  | File
  | Element
  | ShepardValue;
