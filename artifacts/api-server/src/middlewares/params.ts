/**
 * Type-safe route param helper for Express 5.
 * In Express 5, req.params values are typed as string | string[], but at runtime
 * they are always strings in named-param routes. This helper narrows the type.
 */
export function intParam(value: string | string[]): number {
  return parseInt(Array.isArray(value) ? value[0] : value, 10);
}

export function strParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}
