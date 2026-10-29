import mongoose from 'mongoose';
import { ApiError } from '../utils/api-error.js';

export function notFoundHandler(request, response, next) {
  next(new ApiError(404, `Route not found: ${request.method} ${request.originalUrl}`));
}

export function errorHandler(error, request, response, next) {
  let status = error.status || 500;
  let message = error.message || 'An unexpected error occurred.';
  let details = error.details;

  if (error instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Database validation failed.';
    details = Object.values(error.errors).map(({ path, message: detail }) => ({ field: path, message: detail }));
  } else if (error instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid value for ${error.path}.`;
  } else if (error?.code === 11000) {
    status = 409;
    message = 'A record with this code already exists.';
  }

  if (status >= 500) {
    request.log?.error?.(error);
    console.error(error);
    message = process.env.NODE_ENV === 'production' ? 'Internal server error.' : message;
  }

  response.status(status).json({
    success: false,
    error: { message, ...(details ? { details } : {}) }
  });
}
