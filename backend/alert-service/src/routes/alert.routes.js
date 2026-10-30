import { Router } from 'express';
import {
  acknowledgeAlert,
  createAlert,
  deleteAlert,
  getAlert,
  getStats,
  listAlerts,
  reopenAlert,
  resolveAlert,
  scanNow,
  scanStatus,
  updateAlert
} from '../controllers/alert.controller.js';
import { validateBody, validateObjectId, validateQuery } from '../middlewares/validate.js';
import { validateAlertInput, validateListQuery } from '../validators/alert.validator.js';

const router = Router();

// Every route with :id first checks that the ID is a valid MongoDB ObjectId.
router.param('id', validateObjectId);

// Fixed paths must be declared before "/:id", otherwise "stats" would be read as an ID.
router.get('/stats', getStats);
router.get('/scan/status', scanStatus);
router.post('/scan', scanNow);

router.get('/', validateQuery(validateListQuery), listAlerts);
router.post('/', validateBody(validateAlertInput), createAlert);
router.get('/:id', getAlert);
router.put('/:id', validateBody(validateAlertInput, { partial: true }), updateAlert);
router.delete('/:id', deleteAlert);
router.patch('/:id/acknowledge', acknowledgeAlert);
router.patch('/:id/resolve', resolveAlert);
router.patch('/:id/reopen', reopenAlert);

export default router;
