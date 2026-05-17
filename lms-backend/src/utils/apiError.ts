export class ApiError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function badRequest(message: string) {
  return new ApiError(400, message);
}

export function unauthorized(message = 'Unauthorized') {
  return new ApiError(401, message);
}

export function forbidden(message = 'Forbidden') {
  return new ApiError(403, message);
}

export function notFound(message = 'Not found') {
  return new ApiError(404, message);
}

export function conflict(message = 'Conflict') {
  return new ApiError(409, message);
}
