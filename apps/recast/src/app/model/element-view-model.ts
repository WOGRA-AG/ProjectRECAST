import {
  Process,
  Element,
  Step,
  StepProperty,
  ElementProperty,
} from '../../../build/openapi/recast';
import TypeEnum = StepProperty.TypeEnum;
import StorageBackendEnum = ElementProperty.StorageBackendEnum;

export interface ElementViewModel {
  element: Element;
  process: Process;
  currentStep?: Step;
  sortedSteps: Step[];
  properties: ElementViewProperty[];
}

export interface ElementViewProperty {
  type: TypeEnum;
  label: string;
  hint: string;
  stepPropId: number;
  stepId: number;
  storageBackend?: StorageBackendEnum;
  defaultValue: ValueType;
  value?: ValueType;
}

export type ShepardValue = { type: string; value: any };

export type ValueType = string | boolean | File | Element | ShepardValue;
