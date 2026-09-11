import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,72}$/;

export function isStrongPassword(value: string): boolean {
  return STRONG_PASSWORD_PATTERN.test(value)
    && new TextEncoder().encode(value).length <= PASSWORD_MAX_LENGTH;
}

export const strongPasswordValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = typeof control.value === 'string' ? control.value : '';
  return !value || isStrongPassword(value) ? null : { weakPassword: true };
};
