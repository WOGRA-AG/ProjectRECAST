import {
  from,
  mergeMap,
  Observable,
  reduce,
  groupBy as rxGroup,
  map,
} from 'rxjs';
import { Document, parseAllDocuments } from 'yaml';
import { Process, StepProperty } from '../../../../build/openapi/recast';
import TypeEnum = StepProperty.TypeEnum;

export const groupBy = <
  T extends Include<any, string | number | symbol>,
  G extends keyof T
>(
  elements: T[],
  key: G
): Record<T[G], T[]> =>
  elements.reduce((prev, current) => {
    (prev[current[key]] = prev[current[key]] || []).push(current);
    return prev;
  }, {} as Record<T[G], T[]>);

export const groupBy$ = <
  T extends Include<any, string | number | symbol>,
  G extends keyof T
>(
  val: T[],
  key: G
): Observable<{ key: T[G]; values: T[] }> =>
  from(val).pipe(
    rxGroup(prop => prop[key]),
    mergeMap(group$ =>
      group$.pipe(
        reduce(
          (acc, cur) => {
            acc.values.push(cur);
            return acc;
          },
          { key: group$.key, values: [] as T[] }
        )
      )
    )
  );

type Include<T, K extends keyof any> = Pick<T, Extract<keyof T, K>>;

export const yamlToProcess$ = (file: File): Observable<Process[]> =>
  from(file.text()).pipe(
    map(text => {
      const documents: Document[] = parseAllDocuments(text);
      if (!documents.length) {
        throw Error($localize`:@@err.file.empty:No valid Yaml found in File`);
      }
      return documents.map(doc => doc.toJSON() as Process);
    })
  );

export const elementComparator = <T>(a: T, b: T): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

export const isReference = (type: string): boolean =>
  !Object.values(TypeEnum).toString().includes(type);
// && in Process Names

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (): void => {
      resolve(reader.result as string);
    };
    reader.onerror = (error): void => reject(error);
  });

export const base64ToFile = (base64String: string, fileName: string): File => {
  const byteCharacters = atob(base64String.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const fileType = base64String.split(',')[0].split(':')[1].split(';')[0];
  return new File([byteArray], fileName, { type: fileType });
};

export const fileToStr = async (file: File): Promise<string> => {
  const fileName = file.name;
  const base64 = await fileToBase64(file);
  return `${fileName}__${base64}`;
};

export const strToFile = async (
  dbString: string
): Promise<File | undefined> => {
  const splitIndex = dbString.indexOf('__');
  if (splitIndex === -1) {
    return undefined;
  }
  const fileName = dbString.substring(0, splitIndex);
  return base64ToFile(dbString.substring(splitIndex + 2), fileName);
};
