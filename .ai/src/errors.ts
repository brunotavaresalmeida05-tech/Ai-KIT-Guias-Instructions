export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown): AppError =>
  new AppError(400, 'bad_request', message, details);

export const unauthorized = (message = 'Unauthorized'): AppError =>
  new AppError(401, 'unauthorized', message);

export const notFound = (message = 'Not found'): AppError =>
  new AppError(404, 'not_found', message);

export const conflict = (message: string): AppError =>
  new AppError(409, 'conflict', message);

export const tooManyRequests = (message = 'Too many requests'): AppError =>
  new AppError(429, 'too_many_requests', message);
