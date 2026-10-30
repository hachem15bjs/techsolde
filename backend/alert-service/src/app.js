import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import alertRoutes from './routes/alert.routes.js';
import { requireDatabase } from './middlewares/require-database.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { asyncHandler } from './utils/async-handler.js';
import { isPromotionServiceReachable } from './services/promotion-client.js';

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '20kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', asyncHandler(async (request, response) => {
  const connected = mongoose.connection.readyState === 1;
  const promotionService = (await isPromotionServiceReachable()) ? 'reachable' : 'unreachable';
  response.status(connected ? 200 : 503).json({
    success: connected,
    data: {
      status: connected ? 'ok' : 'database disconnected',
      database: connected ? 'connected' : 'disconnected',
      promotionService
    }
  });
}));
app.use('/api/alerts', requireDatabase, alertRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
