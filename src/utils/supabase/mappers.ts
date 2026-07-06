/**
 * Data mapping utilities.
 * With Prisma, column names match the TypeScript field names directly
 * (camelCase), so snake_case ↔ camelCase conversion is no longer needed.
 * This file is kept for backward compatibility but the functions are no-ops.
 */

export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
