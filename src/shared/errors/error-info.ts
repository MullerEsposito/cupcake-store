export function errorInfo(error: unknown): Record<string, unknown> {
  return typeof error === 'object' && error !== null ? error as Record<string, unknown> : {};
}
export function errorCode(error: unknown): string {
  const code = errorInfo(error).code;
  return typeof code === 'string' ? code : 'INTERNAL';
}
