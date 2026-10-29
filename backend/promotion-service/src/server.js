import 'dotenv/config';
import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

const port = Number(process.env.PORT ?? 5003);

try {
  await connectDatabase();
  const server = app.listen(port, () => {
    console.info(`Promotion Service listening at http://localhost:${port}`);
  });

  const shutdown = async (signal) => {
    console.info(`${signal} received; closing Promotion Service.`);
    server.close(async (error) => {
      if (error) {
        console.error('Failed to close the HTTP server cleanly.', error);
        process.exitCode = 1;
      }
      await disconnectDatabase();
      process.exit();
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
} catch (error) {
  console.error('Promotion Service could not connect to MongoDB.', error.message);
  process.exitCode = 1;
}
