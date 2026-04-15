import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError, z } from 'zod';
import { logger } from '../../utils';

export interface ValidationOptions {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
  headers?: ZodSchema;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  path: (string | number)[];
}

export function createValidationMiddleware(options: ValidationOptions) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const errors: ValidationError[] = [];

    try {
      // Validate request body
      if (options.body && request.body !== undefined) {
        const result = options.body.safeParse(request.body);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'body'));
        } else {
          request.body = result.data;
        }
      }

      // Validate URL parameters
      if (options.params) {
        const result = options.params.safeParse(request.params);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'params'));
        } else {
          request.params = result.data;
        }
      }

      // Validate query parameters
      if (options.query) {
        const result = options.query.safeParse(request.query);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'query'));
        } else {
          request.query = result.data;
        }
      }

      // Validate headers
      if (options.headers) {
        const result = options.headers.safeParse(request.headers);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'headers'));
        }
      }

      if (errors.length > 0) {
        logger.warn(`Validation failed for ${request.method} ${request.url}:`, errors);
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'The request contains invalid data',
          details: errors,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    } catch (error) {
      logger.error('Unexpected error in validation middleware:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during validation',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  };
}

function formatZodErrors(zodError: ZodError, field: string): ValidationError[] {
  return zodError.errors.map(error => ({
    field: `${field}.${error.path.join('.')}`,
    message: error.message,
    code: error.code,
    path: error.path,
  }));
}

// Pre-built validation middleware for common cases
export const validateUuidParam = createValidationMiddleware({
  params: z.object({
    id: z.string().uuid('Invalid UUID format'),
  }),
});

export const validatePaginationQuery = createValidationMiddleware({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('asc'),
  }),
});

// Type guard to check if request body is validated
export function isValidatedRequest<T>(
  request: FastifyRequest,
  schema: ZodSchema<T>
): request is FastifyRequest & { body: T } {
  try {
    schema.parse(request.body);
    return true;
  } catch {
    return false;
  }
}