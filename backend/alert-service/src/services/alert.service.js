// Database operations for alerts (CRUD, status changes, statistics).
import { Alert, ALERT_TYPES, SEVERITIES } from '../models/alert.model.js';
import { ApiError } from '../utils/api-error.js';

const SORT_OPTIONS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  severity: { isOpen: -1, severityRank: -1, createdAt: -1, _id: -1 } // open critical alerts first
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findAlertOrFail(id) {
  const alert = await Alert.findById(id);
  if (!alert) throw new ApiError(404, 'Alert not found.');
  return alert;
}

export async function listAlerts({ page, limit, search, severity, status, type, source, sort }) {
  const filter = {};
  if (severity) filter.severity = severity;
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (source) filter.source = source;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: pattern }, { description: pattern }, { relatedEntityLabel: pattern }];
  }

  const [items, totalItems] = await Promise.all([
    Alert.find(filter).sort(SORT_OPTIONS[sort]).skip((page - 1) * limit).limit(limit).lean(),
    Alert.countDocuments(filter)
  ]);
  const totalPages = Math.ceil(totalItems / limit);

  return {
    items,
    meta: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 && totalPages > 0 }
  };
}

export async function getAlert(id) {
  return (await findAlertOrFail(id)).toObject();
}

export async function createManualAlert(input) {
  const alert = await Alert.create({ ...input, type: 'custom', source: 'manual', status: 'new' });
  return alert.toObject();
}

export async function updateAlert(id, changes) {
  const alert = await findAlertOrFail(id);

  // Automatic alerts are owned by the detection engine: only the admin notes may change,
  // so the rule key, related record and detected values always stay consistent.
  if (alert.source !== 'manual') {
    const blocked = Object.keys(changes).filter((field) => field !== 'notes');
    if (blocked.length) {
      throw new ApiError(
        400,
        'Automatic alerts are managed by the detection engine. Only notes can be edited.',
        blocked.map((field) => ({ field, message: `${field} cannot be changed on an automatic alert.` }))
      );
    }
  }

  alert.set(changes);
  await alert.save();
  return alert.toObject();
}

export async function deleteAlert(id) {
  const alert = await Alert.findByIdAndDelete(id);
  if (!alert) throw new ApiError(404, 'Alert not found.');
  return alert;
}

export async function acknowledgeAlert(id) {
  const alert = await findAlertOrFail(id);
  if (alert.status !== 'new') {
    throw new ApiError(409, `Only new alerts can be acknowledged; this alert is ${alert.status}.`);
  }
  alert.status = 'acknowledged';
  alert.acknowledgedAt = new Date();
  await alert.save();
  return alert.toObject();
}

export async function resolveAlert(id, reason) {
  const alert = await findAlertOrFail(id);
  if (alert.status === 'resolved') throw new ApiError(409, 'This alert is already resolved.');
  alert.status = 'resolved';
  alert.resolvedAt = new Date();
  alert.autoResolved = false;
  alert.resolutionReason = reason || 'Resolved by an administrator.';
  await alert.save();
  return alert.toObject();
}

export async function reopenAlert(id) {
  const alert = await findAlertOrFail(id);
  if (alert.status !== 'resolved') throw new ApiError(409, 'Only resolved alerts can be reopened.');

  if (alert.ruleKey) {
    const openTwin = await Alert.exists({ ruleKey: alert.ruleKey, isOpen: true });
    if (openTwin) {
      throw new ApiError(409, 'A newer open alert already exists for this rule and record. Work on that alert instead.');
    }
  }

  alert.set({ status: 'new', acknowledgedAt: null, resolvedAt: null, autoResolved: false, resolutionReason: '' });
  await alert.save();
  return alert.toObject();
}

// All numbers come from MongoDB queries; nothing is hardcoded.
export async function getAlertStats() {
  const [total, byStatus, bySeverity, byType, openCritical] = await Promise.all([
    Alert.countDocuments(),
    Alert.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Alert.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
    Alert.aggregate([{ $group: { _id: '$type', count: { $sum: 1 }, open: { $sum: { $cond: ['$isOpen', 1, 0] } } } }]),
    Alert.countDocuments({ severity: 'critical', isOpen: true })
  ]);

  const countFor = (groups, key) => groups.find((group) => group._id === key)?.count ?? 0;

  return {
    total,
    new: countFor(byStatus, 'new'),
    acknowledged: countFor(byStatus, 'acknowledged'),
    resolved: countFor(byStatus, 'resolved'),
    critical: countFor(bySeverity, 'critical'),
    openCritical,
    bySeverity: Object.fromEntries(SEVERITIES.map((severity) => [severity, countFor(bySeverity, severity)])),
    byType: ALERT_TYPES.map((type) => {
      const group = byType.find((entry) => entry._id === type);
      return { type, count: group?.count ?? 0, open: group?.open ?? 0 };
    })
  };
}
