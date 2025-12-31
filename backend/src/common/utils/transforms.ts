import { Transform, TransformFnParams } from 'class-transformer';

/**
 * Transforms a string value to lowercase and trims whitespace.
 * Safe for null/undefined values.
 */
export function ToLowerCase(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === 'string') {
      return value.toLowerCase().trim();
    }
    return value;
  });
}

/**
 * Transforms a string value by trimming whitespace only.
 * Preserves original case. Safe for null/undefined values.
 */
export function Trim(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  });
}

/**
 * Normalizes email: lowercase + trim.
 * Alias for ToLowerCase() with semantic meaning.
 */
export const NormalizeEmail = ToLowerCase;

/**
 * Normalizes username: lowercase + trim.
 * Alias for ToLowerCase() with semantic meaning.
 */
export const NormalizeUsername = ToLowerCase;
