export type ApplicationErrorCode = 'VALIDATION' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMIT' | 'UNAVAILABLE';

export class ApplicationError extends Error {
  constructor(public readonly code: ApplicationErrorCode, message: string) {
    super(message);
    this.name = 'ApplicationError';
  }
}
