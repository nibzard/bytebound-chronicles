export {
  createValidationMiddleware,
  validateUuidParam,
  validatePaginationQuery,
  isValidatedRequest,
} from './validation';

export {
  createErrorHandler,
  GameError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  ServiceUnavailableError,
  throwNotFound,
  throwValidation,
  throwConflict,
  throwUnauthorized,
  throwForbidden,
  throwRateLimit,
  throwServiceUnavailable,
  isAppError,
} from './errorHandler';

export type {
  ValidationOptions,
  ValidationError as ValidationErrorType,
} from './validation';

export type {
  AppError,
  ErrorResponse,
} from './errorHandler';