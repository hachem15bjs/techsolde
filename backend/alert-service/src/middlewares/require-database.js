import mongoose from 'mongoose';
import { ApiError } from '../utils/api-error.js';

// Answers immediately with 503 when MongoDB is not connected,
// instead of letting the request wait for a database that is down.
export function requireDatabase(request, response, next) {
  if (mongoose.connection.readyState !== 1) {
    return next(new ApiError(503, 'The alerts database is not connected. Check that MongoDB is running.'));
  }
  next();
}
