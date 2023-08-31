import { AbstractControl, ValidatorFn } from '@angular/forms';

// Custom validator function to check file extensions
export function fileExtensionValidator(
  allowedExtensions: string[]
): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    if (!control.value) {
      return null; // No file selected, validation passes
    }

    if (!(control.value instanceof File)) {
      return { invalidFileType: true }; // Invalid file type, validation fails
    }

    const file: File = control.value;
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension && allowedExtensions.includes(fileExtension)) {
      return null; // Valid extension, validation passes
    }

    return { invalidExtension: true }; // Invalid extension, validation fails
  };
}

export const imageFileExtensionValidator = fileExtensionValidator([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'webp',
  'svg',
  'tiff',
  'tif',
  'ico',
  'jp2',
  'jpx',
  'psd',
  'heic',
]);
