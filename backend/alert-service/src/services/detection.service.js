// The detection engine: fetch data -> evaluate rules -> save results in MongoDB.
import { Alert, SEVERITY_RANK } from '../models/alert.model.js';
import { ScanRun } from '../models/scan-run.model.js';
import { ApiError } from '../utils/api-error.js';
import { getDetectionSettings } from '../config/settings.js';
import { detectConditions, getEnabledRules, RULES } from './detection-rules.js';
import { fetchPromotionData } from './promotion-client.js';

// Simple in-process lock: a manual and an automatic scan can never overlap.
let scanInProgress = false;

function hasChanged(alert, finding) {
  return alert.title !== finding.title
    || alert.description !== finding.description
    || alert.severity !== finding.severity
    || alert.fingerprint !== finding.fingerprint
    || alert.relatedEntityLabel !== finding.relatedEntityLabel
    || JSON.stringify(alert.details) !== JSON.stringify(finding.details);
}

// Saves one finding and says what happened: created, updated, unchanged or suppressed.
async function saveFinding(finding, now) {
  const openAlert = await Alert.findOne({ ruleKey: finding.ruleKey, isOpen: true });

  if (openAlert) {
    const changed = hasChanged(openAlert, finding);
    const escalated = SEVERITY_RANK[finding.severity] > openAlert.severityRank;
    openAlert.lastDetectedAt = now;
    if (changed) {
      openAlert.set({
        title: finding.title,
        description: finding.description,
        severity: finding.severity,
        fingerprint: finding.fingerprint,
        details: finding.details,
        relatedEntityLabel: finding.relatedEntityLabel
      });
    }
    // A worse situation needs attention again, even if it was already acknowledged.
    if (escalated && openAlert.status === 'acknowledged') {
      openAlert.status = 'new';
      openAlert.acknowledgedAt = null;
    }
    await openAlert.save();
    return changed ? 'updated' : 'unchanged';
  }

  // Do not re-raise a condition the administrator resolved by hand if nothing important changed.
  const lastResolved = await Alert.findOne({ ruleKey: finding.ruleKey, isOpen: false }).sort({ resolvedAt: -1 });
  if (lastResolved && !lastResolved.autoResolved && lastResolved.fingerprint === finding.fingerprint) {
    return 'suppressed';
  }

  try {
    await Alert.create({ ...finding, status: 'new', lastDetectedAt: now });
    return 'created';
  } catch (error) {
    // 11000 = duplicate key: another scan created the same open alert a moment ago.
    if (error?.code === 11000) return 'unchanged';
    throw error;
  }
}

// Automatic alerts whose condition disappeared are resolved automatically.
async function resolveClearedAlerts(activeRuleKeys, enabledTypes, now) {
  const clearedAlerts = await Alert.find({
    isOpen: true,
    source: { $ne: 'manual' },
    type: { $in: enabledTypes },
    ruleKey: { $nin: activeRuleKeys }
  });

  for (const alert of clearedAlerts) {
    alert.status = 'resolved';
    alert.resolvedAt = now;
    alert.autoResolved = true;
    alert.resolutionReason = 'Condition no longer detected by the automatic scan.';
    await alert.save();
  }
  return clearedAlerts.length;
}

export function isScanRunning() {
  return scanInProgress;
}

export async function runScan(trigger = 'manual') {
  if (scanInProgress) throw new ApiError(409, 'A scan is already running. Please wait for it to finish.');
  scanInProgress = true;

  const startedAt = new Date();
  const summary = { promotionsChecked: 0, couponsChecked: 0, conditionsFound: 0, created: 0, updated: 0, unchanged: 0, suppressed: 0, autoResolved: 0 };

  try {
    const settings = getDetectionSettings();
    const data = await fetchPromotionData();
    summary.promotionsChecked = data.promotions.length;
    summary.couponsChecked = data.coupons.length;

    const findings = detectConditions(data, settings, startedAt);
    summary.conditionsFound = findings.length;

    // One finding at a time keeps the logic easy to follow and avoids race conditions.
    for (const finding of findings) {
      const outcome = await saveFinding(finding, startedAt);
      summary[outcome] += 1;
    }

    const enabledTypes = getEnabledRules(settings).map((rule) => rule.type);
    summary.autoResolved = await resolveClearedAlerts(findings.map((finding) => finding.ruleKey), enabledTypes, startedAt);

    const finishedAt = new Date();
    const run = await ScanRun.create({ trigger, status: 'success', startedAt, finishedAt, durationMs: finishedAt - startedAt, ...summary });
    return run.toObject();
  } catch (error) {
    const finishedAt = new Date();
    // Record the failure too, but never hide the original error if this save fails.
    await ScanRun.create({ trigger, status: 'failed', startedAt, finishedAt, durationMs: finishedAt - startedAt, ...summary, error: error.message })
      .catch(() => {});
    throw error;
  } finally {
    scanInProgress = false;
  }
}

export async function getScanStatus() {
  const settings = getDetectionSettings();
  const [lastScan, lastSuccessfulScan] = await Promise.all([
    ScanRun.findOne().sort({ startedAt: -1 }).lean(),
    ScanRun.findOne({ status: 'success' }).sort({ startedAt: -1 }).lean()
  ]);

  return {
    running: scanInProgress,
    lastScan,
    lastSuccessfulScan,
    autoScanIntervalMinutes: settings.autoScanIntervalMinutes,
    rules: RULES.map((rule) => ({
      type: rule.type,
      label: rule.label,
      entity: rule.entity,
      description: rule.describe(settings),
      enabled: !settings.disabledRules.includes(rule.type)
    }))
  };
}
