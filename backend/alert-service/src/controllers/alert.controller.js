import { asyncHandler } from '../utils/async-handler.js';
import { ApiError } from '../utils/api-error.js';
import * as alertService from '../services/alert.service.js';
import { getScanStatus, runScan } from '../services/detection.service.js';

export const listAlerts = asyncHandler(async (request, response) => {
  const result = await alertService.listAlerts(request.validatedQuery);
  response.json({ success: true, data: result.items, meta: result.meta });
});

export const getAlert = asyncHandler(async (request, response) => {
  response.json({ success: true, data: await alertService.getAlert(request.params.id) });
});

export const createAlert = asyncHandler(async (request, response) => {
  const alert = await alertService.createManualAlert(request.validatedBody);
  response.status(201).json({ success: true, data: alert });
});

export const updateAlert = asyncHandler(async (request, response) => {
  response.json({ success: true, data: await alertService.updateAlert(request.params.id, request.validatedBody) });
});

export const deleteAlert = asyncHandler(async (request, response) => {
  const alert = await alertService.deleteAlert(request.params.id);
  response.json({ success: true, message: 'Alert deleted successfully.', data: { id: alert.id } });
});

export const acknowledgeAlert = asyncHandler(async (request, response) => {
  response.json({ success: true, data: await alertService.acknowledgeAlert(request.params.id) });
});

export const resolveAlert = asyncHandler(async (request, response) => {
  const reason = request.body?.reason;
  if (reason !== undefined && (typeof reason !== 'string' || reason.length > 300)) {
    throw new ApiError(400, 'reason must be text of at most 300 characters.');
  }
  response.json({ success: true, data: await alertService.resolveAlert(request.params.id, reason?.trim()) });
});

export const reopenAlert = asyncHandler(async (request, response) => {
  response.json({ success: true, data: await alertService.reopenAlert(request.params.id) });
});

export const getStats = asyncHandler(async (request, response) => {
  response.json({ success: true, data: await alertService.getAlertStats() });
});

export const scanNow = asyncHandler(async (request, response) => {
  const scan = await runScan('manual');
  response.json({
    success: true,
    message: `Scan finished: ${scan.conditionsFound} condition(s) found, ${scan.created} new alert(s), ${scan.autoResolved} auto-resolved.`,
    data: scan
  });
});

export const scanStatus = asyncHandler(async (request, response) => {
  response.json({ success: true, data: await getScanStatus() });
});
