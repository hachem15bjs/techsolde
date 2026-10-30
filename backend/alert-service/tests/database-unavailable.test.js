// No database connection is opened in this file, to check how the API behaves when MongoDB is down.
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';

describe('when MongoDB is unavailable', () => {
  it('answers 503 on alert routes instead of hanging', async () => {
    const response = await request(app).get('/api/alerts');
    expect(response.status).toBe(503);
    expect(response.body.error.message).toMatch(/database is not connected/);
  });

  it('reports the database as disconnected in the health check', async () => {
    process.env.PROMOTION_API_URL = 'http://127.0.0.1:1/api';
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(503);
    expect(response.body.data).toMatchObject({ database: 'disconnected', promotionService: 'unreachable' });
  });

  it('rejects a connection to an unreachable MongoDB server', async () => {
    await expect(connectDatabase('mongodb://127.0.0.1:1/unreachable')).rejects.toThrow();
  });

  it('requires a connection string', async () => {
    await expect(connectDatabase('')).rejects.toThrow('MONGODB_URI is required');
  });
});
