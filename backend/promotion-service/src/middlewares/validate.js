import { ApiError } from '../utils/api-error.js';

export function validate(schema, { partial = false } = {}) {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return next(
        new ApiError(
          400,
          'Request validation failed.',
          result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        )
      );
    }

    request.validatedBody = result.data;
    if (partial) request.isPartialUpdate = true;
    next();
  };
}
