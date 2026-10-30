import 'dotenv/config';
import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { getDetectionSettings } from './config/settings.js';
import { isScanRunning, runScan } from './services/detection.service.js';

const port = Number(process.env.PORT ?? 5004);

// Background scan with a standard Node.js timer. It never blocks requests:
// runScan is asynchronous, and a tick is skipped while another scan is running.
function startAutomaticScans() {
  const minutes = getDetectionSettings().autoScanIntervalMinutes;
  if (minutes <= 0) {
    console.info('Automatic scans are off (AUTO_SCAN_INTERVAL_MINUTES=0). Use "Scan Now" instead.');
    return null;
  }

  console.info(`Automatic scans every ${minutes} minute(s).`);
  return setInterval(async () => {
    if (isScanRunning()) return;
    try {
      const scan = await runScan('automatic');
      console.info(`Automatic scan: ${scan.conditionsFound} condition(s), ${scan.created} new, ${scan.autoResolved} auto-resolved.`);
    } catch (error) {
      console.warn(`Automatic scan failed: ${error.message}`);
    }
  }, minutes * 60 * 1000);
}

try {
  // One MongoDB connection is opened at startup and shared by every request.
  await connectDatabase();
  const server = app.listen(port, () => {
    console.info(`Alert Service listening at http://localhost:${port}`);
  });
  const scanTimer = startAutomaticScans();

  const shutdown = async (signal) => {
    console.info(`${signal} received; closing Alert Service.`);
    clearInterval(scanTimer);
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
  console.error('Alert Service could not connect to MongoDB.', error.message);
  process.exitCode = 1;
}
