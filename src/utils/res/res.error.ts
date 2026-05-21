export class AppError extends Error {
  constructor(message: string, public statusCode?: number, cause?: unknown) {
    super(message, { cause });
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestException extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 400, cause);
  }
}

export class NotFoundException extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 404, cause);
  }
}

export class ConflictException extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 409, cause);
  }
}

export class UnauthorizedException extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 401, cause);
  }
}

export class ForbiddenException extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 403, cause);
  }
}

