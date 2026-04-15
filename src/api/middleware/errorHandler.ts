import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { logger } from '../../utils';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

export class GameError extends Error implements AppError {
  public statusCode: number;
  public code: string;
  public details?: any;
  public isOperational: boolean = true;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.name = 'GameError';
    this.statusCode = statusCode;
    this.code = code || 'GAME_ERROR';
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends GameError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends GameError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends GameError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends GameError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends GameError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends GameError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends GameError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
  path: string;
  requestId?: string;
  stack?: string;
}

export function createErrorHandler(includeStack: boolean = false) {
  return async (error: FastifyError | AppError, request: FastifyRequest, reply: FastifyReply) => {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const requestId = request.id;

    // Default error response
    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: any = undefined;

    // Handle different error types
    if (error.name === 'ValidationError' || error.statusCode === 400) {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      message = error.message || 'Invalid request data';
      details = (error as any).details;
    } else if (error.statusCode) {
      statusCode = error.statusCode;
      errorCode = (error as AppError).code || 'HTTP_ERROR';
      message = error.message;
      details = (error as AppError).details;
    } else if (error.code) {
      // Handle Fastify-specific errors
      switch (error.code) {
        case 'FST_ERR_NOT_FOUND':
          statusCode = 404;
          errorCode = 'NOT_FOUND';
          message = 'Endpoint not found';
          break;
        case 'FST_ERR_BAD_STATUS_CODE':
          statusCode = 500;
          errorCode = 'INVALID_STATUS_CODE';
          message = 'Internal server error';
          break;
        default:
          statusCode = 500;
          errorCode = error.code;
          message = error.message;
      }
    }

    // Build error response
    const errorResponse: ErrorResponse = {
      error: getErrorTitle(statusCode),
      message,
      code: errorCode,
      timestamp,
      path,
      requestId,
    };

    if (details) {
      errorResponse.details = details;
    }

    if (includeStack && error.stack) {
      errorResponse.stack = error.stack;
    }

    // Log error with appropriate level
    if (statusCode >= 500) {
      logger.error({
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: errorCode,
        },
        request: {
          method: request.method,
          url: request.url,
          params: request.params,
          query: request.query,
          headers: request.headers,
          id: requestId,
        },
      }, `Server error: ${message}`);
    } else if (statusCode >= 400) {
      logger.warn({
        error: {
          name: error.name,
          message: error.message,
          code: errorCode,
        },
        request: {
          method: request.method,
          url: request.url,
          params: request.params,
          query: request.query,
          id: requestId,
        },
      }, `Client error: ${message}`);
    }

    // Send error response
    return reply.status(statusCode).send(errorResponse);
  };
}

function getErrorTitle(statusCode: number): string {
  switch (statusCode) {
    case 400: return 'Bad Request';
    case 401: return 'Unauthorized';
    case 403: return 'Forbidden';
    case 404: return 'Not Found';
    case 409: return 'Conflict';
    case 422: return 'Unprocessable Entity';
    case 429: return 'Too Many Requests';
    case 500: return 'Internal Server Error';
    case 502: return 'Bad Gateway';
    case 503: return 'Service Unavailable';
    case 504: return 'Gateway Timeout';
    default: return 'Error';
  }
}

// Utility functions for throwing common errors
export function throwNotFound(resource: string, id?: string): never {
  throw new NotFoundError(resource, id);
}

export function throwValidation(message: string, details?: any): never {
  throw new ValidationError(message, details);
}

export function throwConflict(message: string, details?: any): never {
  throw new ConflictError(message, details);
}

export function throwUnauthorized(message?: string): never {
  throw new UnauthorizedError(message);
}

export function throwForbidden(message?: string): never {
  throw new ForbiddenError(message);
}

export function throwRateLimit(message?: string): never {
  throw new RateLimitError(message);
}

export function throwServiceUnavailable(message?: string): never {
  throw new ServiceUnavailableError(message);
}

// Error response type guard
export function isAppError(error: any): error is AppError {
  return error && typeof error === 'object' && 'isOperational' in error;
}