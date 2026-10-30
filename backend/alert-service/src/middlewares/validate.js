import mongoose from 'mongoose';
import { ApiError } from '../utils/api-error.js';

// Runs a validator on request.body and stores the cleaned data in request.validatedBody.
export function validateBody(validator, options) {
  return (request, response, next) => {
    const { value, errors } = validator(request.body, options);
    if (errors.length) return next(new ApiError(400, 'Request validation failed.', errors));
    request.validatedBody = value;
    next();
  };
}

// Same idea for the query string (?page=1&severity=high...).
export function validateQuery(validator) {
  return (request, response, next) => {
    const { value, errors } = validator(request.query);
    if (errors.length) return next(new ApiError(400, 'Invalid query parameters.', errors));
    request.validatedQuery = value;
    next();
  };
}

// Used with router.param('id', ...) so every /:id route rejects bad IDs with 400.
export function validateObjectId(request, response, next, id) {
  if (!mongoose.isValidObjectId(id)) return next(new ApiError(400, 'Invalid alert ID.'));
  next();
}
