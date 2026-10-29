import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import promotionRoutes from './routes/promotion.routes.js';
import couponRoutes from './routes/coupon.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '20kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (request, response) => {
  const connected = mongoose.connection.readyState === 1;
  response.status(connected ? 200 : 503).json({
    success: connected,
    data: { status: connected ? 'ok' : 'database disconnected', database: connected ? 'connected' : 'disconnected' }
  });
});
app.use('/api/promotions', promotionRoutes);
app.use('/api/coupons', couponRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
